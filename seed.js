const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false }
    : false
});

pool.on("connect", client => {
  client.query("SET search_path TO jewellery, public").catch(err => console.error("search_path error:", err.message));
});

const products = [
  ["classic-solitaire-ring","Classic Solitaire Ring","Rings","18K Gold","18K",3.2,28999,null,"A refined everyday solitaire-inspired ring with a timeless profile.","/assets/jewellery-1.svg","NEW",true],
  ["royal-polki-necklace","Royal Polki Necklace","Necklace","22K Gold","22K",24.8,189999,null,"Statement necklace inspired by traditional bridal craftsmanship.","/assets/jewellery-2.svg","BRIDAL",true],
  ["diamond-drop-earrings","Diamond Drop Earrings","Earrings","18K Gold","18K",5.7,64999,null,"Elegant drop earrings designed for evening and occasion wear.","/assets/jewellery-3.svg","DIAMOND",true],
  ["heritage-bangles-pair","Heritage Bangles Pair","Bangles","22K Gold","22K",18.4,129999,null,"Classic textured bangles with a rich heritage finish.","/assets/jewellery-4.svg","BESTSELLER",true],
  ["signature-chain-bracelet","Signature Chain Bracelet","Bracelets","22K Gold","22K",8.9,59999,null,"Minimal chain bracelet with a polished luxury finish.","/assets/jewellery-5.svg",null,true],
  ["ruby-halo-pendant","Ruby Halo Pendant","Pendants","18K Gold","18K",4.9,48999,null,"A warm ruby-inspired pendant silhouette for modern styling.","/assets/jewellery-6.svg","NEW",true],
  ["bridal-mangalsutra","Bridal Mangalsutra","Mangalsutra","22K Gold","22K",11.8,89999,null,"A contemporary bridal mangalsutra with a classic Indian character.","/assets/jewellery-7.svg","BRIDAL",true],
  ["mens-textured-band","Men's Textured Band","Men's Jewellery","18K Gold","18K",6.1,42999,null,"Clean, confident band with a premium textured surface.","/assets/jewellery-8.svg",null,true],
  ["pearl-stud-earrings","Pearl Stud Earrings","Earrings","18K Gold","18K",3.1,21999,null,"Delicate pearl-inspired studs for everyday elegance.","/assets/jewellery-9.svg","NEW",false],
  ["tennis-bracelet","Diamond Tennis Bracelet","Bracelets","18K Gold","18K",7.6,119999,null,"A refined tennis-bracelet silhouette with brilliant sparkle.","/assets/jewellery-10.svg","DIAMOND",false],
  ["silver-moon-pendant","Silver Moon Pendant","Pendants","925 Silver","925",5.4,4999,null,"A delicate 925 silver pendant with a polished moon-inspired silhouette.","/assets/jewellery-6.svg","SILVER",false]
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  for (const x of products) {
    await pool.query(
      `INSERT INTO products
      (slug,name,category,metal,purity,weight_grams,price_inr,compare_price_inr,description,image_url,badge,featured)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (slug) DO UPDATE SET
        name=EXCLUDED.name, category=EXCLUDED.category, metal=EXCLUDED.metal,
        purity=EXCLUDED.purity, weight_grams=EXCLUDED.weight_grams,
        price_inr=EXCLUDED.price_inr, description=EXCLUDED.description,
        image_url=EXCLUDED.image_url, badge=EXCLUDED.badge, featured=EXCLUDED.featured`,
      x
    );
  }
  console.log(`Seeded ${products.length} products.`);
}

main().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => pool.end());
