using System.Text.Json;
using System.Text.RegularExpressions;
namespace Storefront;
public sealed record Product {
 public string Id{get;init;}=""; public string Name{get;init;}="";public string Collection{get;init;}="Boutique edit";
 public string Audience{get;init;}="Discover";public string Family{get;init;}="Signature";
 public string Description{get;init;}="";public string[] Notes{get;init;}=[];
 public decimal? Price{get;init;} public string[] Sizes{get;init;}=["Confirm with store"];
 public string[] Images{get;init;}=[];public string Source{get;init;}="";
 public string PriceLabel=>Price is decimal p?"$"+p.ToString("0.00",System.Globalization.CultureInfo.InvariantCulture):"Ask for price";
}
public sealed class Settings {
 public string[] GalleryImages{get;init;}=[]; public List<string> Services{get;init;}=[]; public string Brand{get;init;}=""; public string DisplayPhone{get;init;}=""; public string Phone{get;init;}="96170791887";
 public string Instagram{get;init;}="";
 public string ContactMode{get;init;}="whatsapp";
 public bool UsesWhatsApp=>ContactMode=="whatsapp";
 public string ContactUrl(string? message=null)=>UsesWhatsApp?"https://wa.me/"+Phone+(string.IsNullOrEmpty(message)?"":"?text="+Uri.EscapeDataString(message)):Instagram;
 public string Hours{get;init;}="Monday–Saturday · 10 AM–8 PM";
 public string Hero{get;init;}="";public string Story{get;init;}="";
 public List<Product> Products{get;init;}=[];
 public List<Branch> Branches{get;init;}=[];
}
public sealed record Branch(string Name,string MapUrl);
public sealed class Catalog {
 public Settings Settings{get;}
 public IReadOnlyList<Product> Products=>Settings.Products;
 public Catalog(IWebHostEnvironment environment){
  Settings=JsonSerializer.Deserialize<Settings>(File.ReadAllText(Path.Combine(environment.ContentRootPath,"Content","catalog.json")),new JsonSerializerOptions{PropertyNameCaseInsensitive=true})??throw new InvalidOperationException("Missing catalogue.");
  if(Settings.UsesWhatsApp&&!Regex.IsMatch(Settings.Phone,"^961[0-9]{7,8}$"))throw new InvalidOperationException("Invalid shop contact.");
  if(!Regex.IsMatch(Settings.Instagram,"^https://www\\.instagram\\.com/[A-Za-z0-9._]{1,30}/?$"))throw new InvalidOperationException("Invalid Instagram link: "+Settings.Instagram);
  if(Settings.ContactMode is not ("whatsapp" or "instagram"))throw new InvalidOperationException("Invalid contact mode.");
  if(Products.Count<1||Products.Select(p=>p.Id).Distinct().Count()!=Products.Count)throw new InvalidOperationException("Catalogue is empty or contains duplicate products.");
  foreach(var p in Products){
   if(!Regex.IsMatch(p.Id,"^[a-z0-9-]+$")||string.IsNullOrWhiteSpace(p.Name)||p.Images.Length==0||p.Sizes.Length==0||p.Price is <=0)throw new InvalidOperationException("Invalid product: "+p.Id);
   foreach(var image in p.Images.Append(Settings.Hero).Append(Settings.Story)){
    if(!image.StartsWith("/images/",StringComparison.Ordinal)||image.Contains("..")||!File.Exists(Path.Combine(environment.WebRootPath,image.TrimStart('/'))))throw new InvalidOperationException("Missing photograph: "+image);
   }
  }
 }
 /// <summary>The placeholder option used when the boutique confirms sizes itself.</summary>
 public static bool IsPlaceholderOption(Product p)=>p.Sizes.Length==1&&p.Sizes[0].StartsWith("Confirm",StringComparison.OrdinalIgnoreCase);
 /// <summary>Show the audience tag only when the catalogue actually uses more than one.</summary>
 public bool ShowAudience=>Products.Select(p=>p.Audience).Distinct().Count()>1;
 public Product? Find(string id)=>Products.FirstOrDefault(p=>p.Id==id);
 public IEnumerable<Product> Search(string? q,string? collection,string? audience,string? family,string? sort){
  var words=(q??"").Trim().Split((char[]?)null,StringSplitOptions.RemoveEmptyEntries);
  var result=Products.Where(p=>words.All(w=>(p.Name+" "+p.Description+" "+p.Collection+" "+p.Family+" "+string.Join(" ",p.Notes)).Contains(w,StringComparison.OrdinalIgnoreCase)));
  if(!string.IsNullOrEmpty(collection))result=result.Where(p=>p.Collection==collection);
  if(!string.IsNullOrEmpty(audience))result=result.Where(p=>p.Audience==audience);
  if(!string.IsNullOrEmpty(family))result=result.Where(p=>p.Family==family);
  return sort switch{"az"=>result.OrderBy(p=>p.Name),"price-asc"=>result.OrderBy(p=>p.Price??decimal.MaxValue),"price-desc"=>result.OrderBy(p=>p.Price.HasValue?0:1).ThenByDescending(p=>p.Price),_=>result};
 }
}
public sealed record OrderLine(string Id,string Size,int Quantity);
public sealed record OrderRequest(string? Name,string? Phone,string? City,string? Address,string? Notes,List<OrderLine>? Items);
public sealed record DraftResult(string? Error,string? Message);
public static class OrderDraft {
 public static DraftResult Create(OrderRequest o,Catalog catalog){
  var name=o.Name?.Trim()??"";var phone=o.Phone?.Trim()??"";var city=o.City?.Trim()??"";
  if(name.Length<2||name.Length>80)return new("Please enter your name (2–80 characters).",null);
  if(!Regex.IsMatch(phone,"^\\+?[0-9 ()-]{8,24}$")||Regex.Replace(phone,"[^0-9]","").Length is <8 or >15)return new("Please enter a valid contact number.",null);
  if(city.Length<2||city.Length>80)return new("Please enter your city or area.",null);
  if((o.Address?.Length??0)>240||(o.Notes?.Length??0)>500)return new("Please shorten the address or notes.",null);
  if(o.Items is null||o.Items.Count is <1 or >30)return new("Add a piece to your bag first.",null);
  var lines=new List<string>();decimal subtotal=0;bool allPriced=true;int count=0;var quantities=new Dictionary<(string,string),int>();
  foreach(var item in o.Items){
   if(item is null)return new("Please review the items in your bag.",null);
   var p=catalog.Find(item.Id);
   if(p is null||item.Quantity is <1 or >10||!p.Sizes.Contains(item.Size))return new("A bag item is no longer available in that option. Please review your bag.",null);
   count+=item.Quantity;if(count>30)return new("For more than 30 items, please contact Zahr Boutique directly.",null);
   var key=(item.Id,item.Size);quantities[key]=quantities.GetValueOrDefault(key)+item.Quantity;
   if(quantities[key]>10)return new("Request up to 10 items per piece option, or contact Zahr Boutique directly.",null);
   if(p.Price is decimal price)subtotal+=price*item.Quantity;else allPriced=false;
   lines.Add($"• {p.Name} — {item.Size} × {item.Quantity}"+(p.Price is decimal v?$" (${v*item.Quantity:0.00})":" — price to confirm"));
  }
  var total=allPriced?$"Product subtotal: ${subtotal:0.00}":(subtotal>0?"Known-price items: $"+subtotal.ToString("0.00")+"; other prices to confirm.":"Prices: please confirm the prices of all requested items.");
  var message="Hello Zahr Boutique! I’d like to request the following:\n\n"+string.Join("\n",lines)+"\n\n"+total+"\nPlease confirm availability, delivery fees and the final total before placing my order.\n\nName: "+name+"\nPhone: "+phone+"\nArea: "+city;
  if(!string.IsNullOrWhiteSpace(o.Address))message+="\nAddress: "+o.Address.Trim();
  if(!string.IsNullOrWhiteSpace(o.Notes))message+="\nNotes: "+o.Notes.Trim();
  return new(null,message);
 }
}

public sealed record ConsultationRequest(string? Name,string? Phone,string? City,string? Service,string? Date,string? Look,string? Notes);
public static class ConsultationDraft {
 public static DraftResult Create(ConsultationRequest r,Catalog c){
  if(c.Settings.Services.Count==0)return new("Please contact the boutique directly.",null);
  var name=r.Name?.Trim()??"";var phone=r.Phone?.Trim()??"";var city=r.City?.Trim()??"";
  if(name.Length is <2 or >80)return new("Please enter your name (2–80 characters).",null);
  if(!Regex.IsMatch(phone,"^\\+?[0-9 ()-]{8,24}$")||Regex.Replace(phone,"[^0-9]","").Length is <8 or >15)return new("Please enter a valid phone number.",null);
  if(city.Length is <2 or >80)return new("Please enter your city or event location.",null);
  if(r.Service is null||!c.Settings.Services.Contains(r.Service))return new("Please choose an enquiry type.",null);
  if((r.Notes?.Length??0)>500)return new("Please keep your notes within 500 characters.",null);
  var date=r.Date?.Trim()??"";
  if(date.Length>0&&(!DateOnly.TryParseExact(date,"yyyy-MM-dd",System.Globalization.CultureInfo.InvariantCulture,System.Globalization.DateTimeStyles.None,out var d)||d<DateOnly.FromDateTime(DateTime.UtcNow)))return new("Please choose a valid date from today onwards, or leave it empty.",null);
  var look=string.IsNullOrEmpty(r.Look)?null:c.Find(r.Look);
  if(!string.IsNullOrEmpty(r.Look)&&look is null)return new("Please choose a look from the current portfolio.",null);
  var message="Hello "+c.Settings.Brand+"! I’d like to enquire about "+r.Service+".\n\nName: "+name+"\nPhone: "+phone+"\nCity / event location: "+city+"\nEvent date: "+(date.Length>0?date:"Not yet decided");
  if(look is not null)message+="\nInspiration: "+look.Name+" (reference: "+look.Id+")";
  if(!string.IsNullOrWhiteSpace(r.Notes))message+="\nPreferences: "+r.Notes.Trim();
  message+="\n\nPlease confirm availability, arrangements and a quote. I understand this is an enquiry, not a confirmed booking or order.";
  return new(null,message);
 }
}

public sealed record GalleryPhoto(string Name,string Category,string Image,string Href);
