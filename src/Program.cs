using System.Text.Json;
using Storefront;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRazorPages();
builder.Services.AddSingleton<Catalog>();
var protection = builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath,"App_Data","keys")));
if(OperatingSystem.IsWindows()) protection.ProtectKeysWithDpapi();
builder.Services.AddAntiforgery(o=>o.HeaderName="X-CSRF-TOKEN");
builder.Services.AddResponseCompression(o=>o.EnableForHttps=true);
builder.Services.AddRateLimiter(o=>{
    o.RejectionStatusCode=429;
    o.AddPolicy("requests",context=>RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString()??"local",_=>new FixedWindowRateLimiterOptions{PermitLimit=20,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));
});
builder.WebHost.ConfigureKestrel(o=>o.Limits.MaxRequestBodySize=24000);
var app=builder.Build();
app.Services.GetRequiredService<Catalog>();
app.UseExceptionHandler("/error");
app.Use(async(ctx,next)=>{
 ctx.Response.OnStarting(()=>{
  ctx.Response.Headers["X-Content-Type-Options"]="nosniff";
  ctx.Response.Headers["Referrer-Policy"]="strict-origin-when-cross-origin";
  ctx.Response.Headers["Content-Security-Policy"]="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
  ctx.Response.Headers["Permissions-Policy"]="camera=(), microphone=(), geolocation=(), payment=()";
  if(!app.Configuration.GetValue("Site:AllowSearchEngines",false))ctx.Response.Headers["X-Robots-Tag"]="noindex, nofollow";
  return Task.CompletedTask;
 });
 // Keep HTTP challenge files usable even when HTTPS redirection is enabled.
 var path=ctx.Request.Path.Value??"";
 const string prefix="/.well-known/acme-challenge/";
 if(path.StartsWith(prefix,StringComparison.OrdinalIgnoreCase)){
  var token=path[prefix.Length..];
  if(System.Text.RegularExpressions.Regex.IsMatch(token,"^[A-Za-z0-9_-]{1,256}$")){
   var file=Path.Combine(app.Environment.ContentRootPath,".well-known","acme-challenge",token);
   if(File.Exists(file)){ctx.Response.ContentType="text/plain";await ctx.Response.SendFileAsync(file);return;}
  }
 }
 if(app.Configuration.GetValue("Site:ForceHttps",false)&&!ctx.Request.IsHttps){ctx.Response.Redirect("https://"+ctx.Request.Host.Host+ctx.Request.Path+ctx.Request.QueryString,true);return;}
 await next();
});
// Friendly error pages for browser pages only; the JSON API keeps its real status codes (415, 429…).
app.UseWhen(c=>!c.Request.Path.StartsWithSegments("/api"),branch=>branch.UseStatusCodePagesWithReExecute("/status/{0}"));
app.UseResponseCompression();
app.UseStaticFiles(new StaticFileOptions{OnPrepareResponse=c=>c.Context.Response.Headers.CacheControl=c.Context.Request.Query.ContainsKey("v")?"public,max-age=31536000,immutable":"public,max-age=604800"});
app.UseRouting();app.UseRateLimiter();app.MapRazorPages();
app.MapGet("/health",()=>Results.Json(new{status="ok",app="zahr-boutique"}));
app.MapGet("/robots.txt",()=>Results.Text(app.Configuration.GetValue("Site:AllowSearchEngines",false)?"User-agent: *\nAllow: /":"User-agent: *\nDisallow: /","text/plain"));
app.MapGet("/api/catalog",(Catalog c)=>Results.Json(c.Products));
app.MapPost("/api/order-draft",async(HttpContext ctx,IAntiforgery csrf,Catalog catalog)=>{
 ctx.Response.Headers.CacheControl="no-store";
 // IIS (in-process) ignores the Kestrel body limit, so apply the same small limit to this request on any server.
 var sizeLimit=ctx.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpMaxRequestBodySizeFeature>();
 if(sizeLimit is {IsReadOnly:false})sizeLimit.MaxRequestBodySize=24000;
 if(!ctx.Request.HasJsonContentType())return Results.StatusCode(415);
 try{await csrf.ValidateRequestAsync(ctx);}catch(AntiforgeryValidationException){return Results.BadRequest(new{error="Your session expired. Refresh this page and try again."});}
 OrderRequest? order;
 try{order=await ctx.Request.ReadFromJsonAsync<OrderRequest>();}catch(JsonException){return Results.BadRequest(new{error="Please check the request and try again."});}catch(BadHttpRequestException e){return Results.StatusCode(e.StatusCode);}
 if(order is null)return Results.BadRequest(new{error="Your request was empty."});
 var result=OrderDraft.Create(order,catalog);
 return result.Error is not null?Results.BadRequest(new{error=result.Error}):Results.Ok(new{message=result.Message,url=catalog.Settings.ContactUrl(result.Message)});
}).RequireRateLimiting("requests");


app.Run();
