const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const PUBLIC_DIR = path.join(__dirname, "public");

let dbConnectionString = process.env.DATABASE_URL || "";
if (dbConnectionString) {
  try {
    const u = new URL(dbConnectionString);
    u.searchParams.set("options", "-c search_path=jewellery,public");
    dbConnectionString = u.toString();
  } catch {}
}
const pool = dbConnectionString ? new Pool({
  connectionString: dbConnectionString,
  ssl: /localhost|127\.0\.0\.1/.test(dbConnectionString) ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
}) : null;

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));

const schema = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf8");
if (pool) {
  pool.on("connect", client => {
    client.query("SET search_path TO jewellery, public").catch(err => console.error("search_path error:", err.message));
  });
}

const sampleProducts = [
  {id:1,slug:"classic-solitaire-ring",name:"Classic Solitaire Ring",category:"Rings",metal:"18K Gold",purity:"18K",weight_grams:3.2,price_inr:28999,description:"A refined everyday solitaire-inspired ring with a timeless profile.",image_url:"/assets/jewellery-1.svg",badge:"NEW",featured:true},
  {id:2,slug:"royal-polki-necklace",name:"Royal Polki Necklace",category:"Necklace",metal:"22K Gold",purity:"22K",weight_grams:24.8,price_inr:189999,description:"Statement necklace inspired by traditional bridal craftsmanship.",image_url:"/assets/jewellery-2.svg",badge:"BRIDAL",featured:true},
  {id:3,slug:"diamond-drop-earrings",name:"Diamond Drop Earrings",category:"Earrings",metal:"18K Gold",purity:"18K",weight_grams:5.7,price_inr:64999,description:"Elegant drop earrings designed for evening and occasion wear.",image_url:"/assets/jewellery-3.svg",badge:"DIAMOND",featured:true},
  {id:4,slug:"heritage-bangles-pair",name:"Heritage Bangles Pair",category:"Bangles",metal:"22K Gold",purity:"22K",weight_grams:18.4,price_inr:129999,description:"Classic textured bangles with a rich heritage finish.",image_url:"/assets/jewellery-4.svg",badge:"BESTSELLER",featured:true},
  {id:5,slug:"signature-chain-bracelet",name:"Signature Chain Bracelet",category:"Bracelets",metal:"22K Gold",purity:"22K",weight_grams:8.9,price_inr:59999,description:"Minimal chain bracelet with a polished luxury finish.",image_url:"/assets/jewellery-5.svg",badge:null,featured:true},
  {id:6,slug:"ruby-halo-pendant",name:"Ruby Halo Pendant",category:"Pendants",metal:"18K Gold",purity:"18K",weight_grams:4.9,price_inr:48999,description:"A warm ruby-inspired pendant silhouette for modern styling.",image_url:"/assets/jewellery-6.svg",badge:"NEW",featured:true},
  {id:7,slug:"bridal-mangalsutra",name:"Bridal Mangalsutra",category:"Mangalsutra",metal:"22K Gold",purity:"22K",weight_grams:11.8,price_inr:89999,description:"A contemporary bridal mangalsutra with a classic Indian character.",image_url:"/assets/jewellery-7.svg",badge:"BRIDAL",featured:true},
  {id:8,slug:"mens-textured-band",name:"Men's Textured Band",category:"Men's Jewellery",metal:"18K Gold",purity:"18K",weight_grams:6.1,price_inr:42999,description:"Clean, confident band with a premium textured surface.",image_url:"/assets/jewellery-8.svg",badge:null,featured:true},
  {id:9,slug:"pearl-stud-earrings",name:"Pearl Stud Earrings",category:"Earrings",metal:"18K Gold",purity:"18K",weight_grams:3.1,price_inr:21999,description:"Delicate pearl-inspired studs for everyday elegance.",image_url:"/assets/jewellery-9.svg",badge:"NEW",featured:false},
  {id:10,slug:"tennis-bracelet",name:"Diamond Tennis Bracelet",category:"Bracelets",metal:"18K Gold",purity:"18K",weight_grams:7.6,price_inr:119999,description:"A refined tennis-bracelet silhouette with brilliant sparkle.",image_url:"/assets/jewellery-10.svg",badge:"DIAMOND",featured:false},
  {id:11,slug:"silver-moon-pendant",name:"Silver Moon Pendant",category:"Pendants",metal:"925 Silver",purity:"925",weight_grams:5.4,price_inr:4999,description:"A delicate 925 silver pendant with a polished moon-inspired silhouette.",image_url:"/assets/jewellery-6.svg",badge:"SILVER",featured:false}
];

async function initDb() {
  if (!pool) {
    console.warn("DATABASE_URL is not set. Catalog will use fallback data; orders require a database.");
    return;
  }
  await pool.query(schema);
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM products");
  if (rows[0].count === 0) {
    for (const x of sampleProducts) {
      await pool.query(
        `INSERT INTO products (slug,name,category,metal,purity,weight_grams,price_inr,description,image_url,badge,featured)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [x.slug,x.name,x.category,x.metal,x.purity,x.weight_grams,x.price_inr,x.description,x.image_url,x.badge,x.featured]
      );
    }
  }
}

function cleanText(value, max = 200) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}
function cleanPhone(value) {
  return String(value ?? "").replace(/[^\d+]/g, "").slice(0, 16);
}
function validPincode(value) {
  return /^[1-9]\d{5}$/.test(String(value ?? "").trim());
}
function rupees(n) {
  return Math.round(Number(n) || 0);
}
function orderNumber() {
  return "MEJ-" + new Date().toISOString().slice(0,10).replaceAll("-","") + "-" +
    crypto.randomBytes(3).toString("hex").toUpperCase();
}
function json(res, status, payload) {
  res.status(status).json(payload);
}
function waUrl(message) {
  const number = String(process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

const buckets = new Map();
function rateLimit(req, res, next) {
  if (!req.path.startsWith("/api/")) return next();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const item = buckets.get(ip) || {start:now,count:0};
  if (now - item.start > 60_000) { item.start=now; item.count=0; }
  item.count++;
  buckets.set(ip,item);
  if (item.count > 120) return json(res,429,{error:"Too many requests. Please try again shortly."});
  next();
}
app.use(rateLimit);

function adminAuthorized(req) {
  const expected = process.env.ADMIN_KEY;
  const supplied = req.get("x-admin-key") || "";
  if (!expected || !supplied) return false;
  const a=Buffer.from(String(expected)), b=Buffer.from(String(supplied));
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
app.get("/api/admin/orders", async (req,res)=>{
  if(!adminAuthorized(req)) return json(res,401,{error:"Unauthorized"});
  if(!pool) return json(res,503,{error:"Database not configured"});
  try{
    const {rows}=await pool.query(`SELECT order_number,customer_name,phone,total_inr,payment_method,payment_status,order_status,created_at FROM orders ORDER BY created_at DESC LIMIT 100`);
    json(res,200,rows);
  }catch(e){json(res,500,{error:"Could not load orders"});}
});
app.patch("/api/admin/orders/:orderNumber", async (req,res)=>{
  if(!adminAuthorized(req)) return json(res,401,{error:"Unauthorized"});
  if(!pool) return json(res,503,{error:"Database not configured"});
  const status=cleanText(req.body?.status,30);
  const allowed=["PLACED","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","PAYMENT_FAILED"];
  if(!allowed.includes(status)) return json(res,400,{error:"Invalid status"});
  try{
    const {rows}=await pool.query(`UPDATE orders SET order_status=$1 WHERE order_number=$2 RETURNING order_number,order_status`,[status,cleanText(req.params.orderNumber,40)]);
    rows[0]?json(res,200,rows[0]):json(res,404,{error:"Order not found"});
  }catch(e){json(res,500,{error:"Could not update order"});}
});
app.get("/api/admin/products", async (req,res)=>{
  if(!adminAuthorized(req)) return json(res,401,{error:"Unauthorized"});
  if(!pool) return json(res,503,{error:"Database not configured"});
  try{const {rows}=await pool.query(`SELECT id,slug,name,category,metal,purity,weight_grams,price_inr,description,image_url,badge,featured,active FROM products ORDER BY created_at DESC`);json(res,200,rows);}
  catch(e){json(res,500,{error:"Could not load products"});}
});
app.post("/api/admin/products", async (req,res)=>{
  if(!adminAuthorized(req)) return json(res,401,{error:"Unauthorized"});
  if(!pool) return json(res,503,{error:"Database not configured"});
  const b=req.body||{};
  const slug=cleanText(b.slug,120).toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"");
  const name=cleanText(b.name,120), category=cleanText(b.category,60), metal=cleanText(b.metal,40), purity=cleanText(b.purity,20);
  const weight=Number(b.weight_grams)||0, price=rupees(b.price_inr);
  if(!slug||!name||!category||!metal||!purity||price<0) return json(res,400,{error:"Invalid product details"});
  try{
    const {rows}=await pool.query(`INSERT INTO products (slug,name,category,metal,purity,weight_grams,price_inr,description,image_url,badge,featured,active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [slug,name,category,metal,purity,weight,price,cleanText(b.description,600),cleanText(b.image_url,500)||"/assets/jewellery-1.svg",cleanText(b.badge,30)||null,Boolean(b.featured),true]);
    json(res,201,rows[0]);
  }catch(e){json(res,400,{error:e.code==="23505"?"Slug already exists.":"Could not create product."});}
});
app.patch("/api/admin/products/:id", async (req,res)=>{
  if(!adminAuthorized(req)) return json(res,401,{error:"Unauthorized"});
  if(!pool) return json(res,503,{error:"Database not configured"});
  const id=Number(req.params.id); const b=req.body||{};
  if(!Number.isInteger(id)) return json(res,400,{error:"Invalid product id"});
  try{
    const {rows}=await pool.query(`UPDATE products SET name=COALESCE($1,name),category=COALESCE($2,category),metal=COALESCE($3,metal),purity=COALESCE($4,purity),
      weight_grams=COALESCE($5,weight_grams),price_inr=COALESCE($6,price_inr),description=COALESCE($7,description),image_url=COALESCE($8,image_url),
      badge=COALESCE($9,badge),featured=COALESCE($10,featured),active=COALESCE($11,active) WHERE id=$12 RETURNING *`,
      [b.name?cleanText(b.name,120):null,b.category?cleanText(b.category,60):null,b.metal?cleanText(b.metal,40):null,b.purity?cleanText(b.purity,20):null,
       b.weight_grams!=null?Number(b.weight_grams):null,b.price_inr!=null?rupees(b.price_inr):null,b.description!=null?cleanText(b.description,600):null,
       b.image_url!=null?cleanText(b.image_url,500):null,b.badge!=null?cleanText(b.badge,30):null,b.featured!=null?Boolean(b.featured):null,b.active!=null?Boolean(b.active):null,id]);
    rows[0]?json(res,200,rows[0]):json(res,404,{error:"Product not found"});
  }catch(e){json(res,400,{error:"Could not update product"});}
});

app.get("/api/health", async (req,res) => {
  let db = "not-configured";
  if (pool) {
    try { await pool.query("SELECT 1"); db="ok"; } catch { db="error"; }
  }
  json(res, db === "ok" || db === "not-configured" ? 200 : 503, {
    status: db === "error" ? "degraded" : "ok",
    service: "milestone-jewellery",
    database: db,
    time: new Date().toISOString()
  });
});

app.get("/api/config", (req,res) => {
  json(res,200,{
    storeName: process.env.STORE_NAME || "Milestone Enterprises",
    phone: process.env.STORE_PHONE || "",
    email: process.env.STORE_EMAIL || "",
    city: process.env.STORE_CITY || "India",
    whatsapp: Boolean(process.env.WHATSAPP_NUMBER),
    razorpay: Boolean(process.env.RAZORPAY_KEY_ID)
  });
});

app.get("/api/categories", async (req,res) => {
  if (!pool) return json(res,200,[...new Set(sampleProducts.map(x=>x.category))].sort());
  try {
    const {rows}=await pool.query("SELECT DISTINCT category FROM products WHERE active=true ORDER BY category");
    json(res,200,rows.map(x=>x.category));
  } catch (e) { json(res,500,{error:"Could not load categories"}); }
});

app.get("/api/products", async (req,res) => {
  const q=cleanText(req.query.q,80);
  const category=cleanText(req.query.category,60);
  const featured=req.query.featured === "1";
  if (!pool) {
    let rows=sampleProducts.filter(x=>x.featured || !featured);
    if (q) rows=rows.filter(x=>(x.name+" "+x.category+" "+x.description).toLowerCase().includes(q.toLowerCase()));
    if (category) rows=rows.filter(x=>x.category.toLowerCase()===category.toLowerCase());
    return json(res,200,rows);
  }
  try {
    const params=[]; const where=["active=true"];
    if(q){params.push(`%${q}%`); where.push(`(name ILIKE $${params.length} OR category ILIKE $${params.length} OR description ILIKE $${params.length})`);}
    if(category){
      if(category==="Diamond Jewellery") where.push("badge='DIAMOND'");
      else if(category==="Bridal Jewellery") where.push("badge='BRIDAL'");
      else if(category==="Gold Jewellery") where.push("metal ILIKE '%Gold%'");
      else if(category==="Silver Jewellery") where.push("metal ILIKE '%Silver%'");
      else { params.push(category); where.push(`category=$${params.length}`); }
    }
    if(featured) where.push("featured=true");
    const {rows}=await pool.query(`SELECT id,slug,name,category,metal,purity,weight_grams,price_inr,compare_price_inr,description,image_url,badge,featured FROM products WHERE ${where.join(" AND ")} ORDER BY featured DESC, created_at DESC`,params);
    json(res,200,rows);
  } catch(e){ console.error(e); json(res,500,{error:"Could not load products"}); }
});

app.get("/api/products/:slug", async (req,res) => {
  const slug=cleanText(req.params.slug,120);
  if (!pool) {
    const item=sampleProducts.find(x=>x.slug===slug);
    return item ? json(res,200,item) : json(res,404,{error:"Product not found"});
  }
  try {
    const {rows}=await pool.query("SELECT id,slug,name,category,metal,purity,weight_grams,price_inr,compare_price_inr,description,image_url,badge,featured FROM products WHERE slug=$1 AND active=true LIMIT 1",[slug]);
    rows[0] ? json(res,200,rows[0]) : json(res,404,{error:"Product not found"});
  } catch(e){json(res,500,{error:"Could not load product"});}
});

async function createRazorpayOrder(amountInr, receipt, notes={}) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method:"POST",
    headers:{"Authorization":`Basic ${auth}`,"Content-Type":"application/json"},
    body:JSON.stringify({amount:Math.round(amountInr*100),currency:"INR",receipt,notes})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.description || "Unable to create online payment order.");
  return data;
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || "")));
}

app.post("/api/payment/verify", async (req,res)=>{
  if(!pool) return json(res,503,{error:"Payment database is not configured."});
  const {orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature}=req.body||{};
  if(!orderNumber || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
    return json(res,400,{error:"Incomplete payment verification data."});
  if(!verifyRazorpaySignature(razorpayOrderId,razorpayPaymentId,razorpaySignature))
    return json(res,400,{error:"Payment signature verification failed."});
  try{
    const {rows}=await pool.query(
      `UPDATE orders SET payment_status='PAID', order_status='CONFIRMED'
       WHERE order_number=$1 AND payment_method='RAZORPAY'
       RETURNING order_number,total_inr`,[orderNumber]);
    if(!rows[0]) return json(res,404,{error:"Order not found."});
    json(res,200,{ok:true,orderNumber:rows[0].order_number,total:rows[0].total_inr});
  }catch(e){console.error(e);json(res,500,{error:"Could not verify payment."});}
});

app.post("/api/orders", async (req,res) => {
  if (!pool) return json(res,503,{error:"Checkout is temporarily unavailable because the store database is not configured."});
  const b=req.body||{};
  const customer_name=cleanText(b.customer_name,80);
  const phone=cleanPhone(b.phone);
  const email=cleanText(b.email,120);
  const address_line1=cleanText(b.address_line1,160);
  const address_line2=cleanText(b.address_line2,160);
  const city=cleanText(b.city,60);
  const state=cleanText(b.state,60);
  const pincode=cleanText(b.pincode,6);
  const notes=cleanText(b.notes,300);
  const payment_method = ["COD","WHATSAPP","RAZORPAY"].includes(b.payment_method) ? b.payment_method : "COD";
  if (payment_method === "RAZORPAY" && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET))
    return json(res,503,{error:"Online payment is not configured yet. Please choose COD or WhatsApp."});
  const items=Array.isArray(b.items)?b.items.slice(0,30):[];
  if(customer_name.length<2 || phone.length<10 || !address_line1 || !city || !state || !validPincode(pincode) || !items.length)
    return json(res,400,{error:"Please complete all required details and add at least one product."});

  const ids=items.map(x=>Number(x.id)).filter(Number.isInteger);
  if(!ids.length) return json(res,400,{error:"Invalid cart."});

  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const {rows:products}=await client.query("SELECT id,name,price_inr,active FROM products WHERE id=ANY($1::int[]) AND active=true",[ids]);
    const map=new Map(products.map(x=>[Number(x.id),x]));
    let subtotal=0; const safeItems=[];
    for(const item of items){
      const product=map.get(Number(item.id));
      const qty=Math.max(1,Math.min(10,Number(item.quantity)||1));
      if(!product) continue;
      const line=rupees(product.price_inr)*qty;
      subtotal+=line;
      safeItems.push({id:product.id,name:product.name,qty,price:rupees(product.price_inr),line});
    }
    if(!safeItems.length) throw new Error("Cart products are no longer available.");
    const shipping=subtotal>=100000?0:499;
    const total=subtotal+shipping;
    const no=orderNumber();
    const order=await client.query(
      `INSERT INTO orders (order_number,customer_name,phone,email,address_line1,address_line2,city,state,pincode,payment_method,subtotal_inr,shipping_inr,total_inr,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING order_number,total_inr`,
      [no,customer_name,phone,email||null,address_line1,address_line2||null,city,state,pincode,payment_method,subtotal,shipping,total,notes||null]
    );
    for(const x of safeItems){
      await client.query(
        `INSERT INTO order_items (order_id,product_id,product_name,quantity,unit_price_inr,line_total_inr)
         VALUES ((SELECT id FROM orders WHERE order_number=$1),$2,$3,$4,$5,$6)`,
        [no,x.id,x.name,x.qty,x.price,x.line]
      );
    }
    await client.query("COMMIT");
    let razorpay = null;
    if (payment_method === "RAZORPAY") {
      try {
        razorpay = await createRazorpayOrder(total, no, {order_number:no});
      } catch (paymentErr) {
        await pool.query("UPDATE orders SET payment_status='FAILED', order_status='PAYMENT_FAILED' WHERE order_number=$1",[no]);
        return json(res,502,{error:paymentErr.message || "Online payment could not be initialized."});
      }
    }
    const message=`Hello Milestone Enterprises, I placed order ${no}. Total ₹${total.toLocaleString("en-IN")}. Please confirm the order.`;
    json(res,201,{orderNumber:no,total,shipping,whatsappUrl:waUrl(message),
      razorpay: razorpay ? {orderId:razorpay.id,keyId:process.env.RAZORPAY_KEY_ID} : null});
  }catch(e){
    await client.query("ROLLBACK");
    console.error(e);
    json(res,400,{error:e.message.includes("Cart products")?e.message:"Could not place order. Please try again."});
  }finally{client.release();}
});

app.get("/api/orders/:orderNumber", async (req,res)=>{
  if(!pool) return json(res,503,{error:"Order tracking is not configured."});
  const no=cleanText(req.params.orderNumber,40);
  const phone=cleanPhone(req.query.phone);
  if(!no || phone.length<10) return json(res,400,{error:"Order number and phone are required."});
  try{
    const {rows}=await pool.query(
      `SELECT order_number,customer_name,total_inr,payment_method,payment_status,order_status,created_at
       FROM orders WHERE order_number=$1 AND phone=$2 LIMIT 1`,[no,phone]);
    rows[0] ? json(res,200,rows[0]) : json(res,404,{error:"Order not found. Check the order number and phone number."});
  }catch(e){json(res,500,{error:"Could not track order"});}
});

app.get("/api/whatsapp", (req,res)=>{
  const message=cleanText(req.query.message,500) || "Hello Milestone Enterprises, I would like to know more about your jewellery collection.";
  const url=waUrl(message);
  url ? res.redirect(url) : json(res,503,{error:"WhatsApp number is not configured yet."});
});

app.use(express.static(PUBLIC_DIR, {
  extensions:["html"],
  maxAge:"1h",
  index:"index.html"
}));

app.get(/.*/, (req,res)=>{
  res.sendFile(path.join(PUBLIC_DIR,"index.html"));
});

async function start(){
  try{ await initDb(); }
  catch(e){ console.error("Database initialization failed:",e.message); }
  const server=http.createServer(app);
  server.listen(PORT,"0.0.0.0",()=>console.log(`Milestone Jewellery running on 0.0.0.0:${PORT}`));
}
start();
