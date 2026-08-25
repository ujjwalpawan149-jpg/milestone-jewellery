(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const state = {
    products: [],
    category: "All",
    search: "",
    cart: JSON.parse(localStorage.getItem("mej_cart") || "[]"),
    wishes: JSON.parse(localStorage.getItem("mej_wishes") || "[]"),
    config: {storeName:"Milestone Enterprises",whatsapp:false}
  };

  const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const save = () => {
    localStorage.setItem("mej_cart", JSON.stringify(state.cart));
    localStorage.setItem("mej_wishes", JSON.stringify(state.wishes));
    updateCounts();
  };
  function toast(msg) {
    const el=$("#toast"); el.textContent=msg; el.classList.add("show");
    clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2600);
  }
  function updateCounts() {
    $("#cartCount").textContent=state.cart.reduce((a,x)=>a+x.quantity,0);
    $("#wishCount").textContent=state.wishes.length;
  }
  function showModal(id) { $("#"+id).classList.add("show"); document.body.style.overflow="hidden"; }
  function closeModals() { $$(".modal").forEach(x=>x.classList.remove("show")); document.body.style.overflow=""; }
  function openCart() { renderCart(); $("#backdrop").classList.add("show"); $("#cartDrawer").classList.add("show"); }
  function closeCart() { $("#backdrop").classList.remove("show"); $("#cartDrawer").classList.remove("show"); }

  async function api(url, options={}) {
    const res = await fetch(url, {headers:{"Content-Type":"application/json"}, ...options});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  async function loadConfig() {
    try {
      state.config = await api("/api/config");
      if(state.config.email) $("#emailLink").href=`mailto:${state.config.email}`;
      if(state.config.phone) $("#footerContact").textContent=`${state.config.phone} · Jewellery Consultation`;
      if(!state.config.razorpay) $(".online-pay")?.remove();
    } catch {}
  }

  async function loadProducts() {
    const params = new URLSearchParams();
    if(state.search) params.set("q",state.search);
    if(state.category !== "All") params.set("category",state.category);
    try {
      state.products=await api("/api/products?"+params.toString());
      renderProducts();
    } catch(e) { $("#productGrid").innerHTML=`<div class="empty">${escapeHtml(e.message)}</div>`; }
  }

  function filteredProducts() {
    return state.products;
  }

  function renderProducts() {
    const rows=filteredProducts();
    const grid=$("#productGrid");
    if(!rows.length){grid.innerHTML=`<div class="empty">No jewellery found. Try another search or category.</div>`;return;}
    grid.innerHTML=rows.map(p=>{
      const wished=state.wishes.includes(Number(p.id));
      return `<article class="product-card">
        <div class="product-image">
          ${p.badge?`<span class="badge">${escapeHtml(p.badge)}</span>`:""}
          <button class="wish ${wished?"active":""}" data-wish="${p.id}" aria-label="Wishlist">${wished?"♥":"♡"}</button>
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">
        </div>
        <div class="product-info">
          <div class="meta">${escapeHtml(p.purity)} · ${Number(p.weight_grams).toFixed(1)}g</div>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="meta">${escapeHtml(p.category)}</div>
          <div class="price"><strong>${money(p.price_inr)}</strong>${p.compare_price_inr?`<del>${money(p.compare_price_inr)}</del>`:""}</div>
          <div class="product-actions"><button class="btn outline" data-view="${escapeHtml(p.slug)}">VIEW</button><button class="btn gold" data-add="${p.id}">ADD</button></div>
        </div>
      </article>`;
    }).join("");
  }

  function findProduct(id){return state.products.find(p=>Number(p.id)===Number(id)) || null;}

  function addCart(id, quantity=1) {
    const p=findProduct(id); if(!p){toast("Product is not available.");return;}
    const existing=state.cart.find(x=>Number(x.id)===Number(id));
    if(existing) existing.quantity=Math.min(10,existing.quantity+quantity);
    else state.cart.push({id:Number(id),quantity:Math.max(1,Math.min(10,quantity))});
    save(); toast(`${p.name} added to cart.`);
  }
  function removeCart(id){state.cart=state.cart.filter(x=>Number(x.id)!==Number(id));save();renderCart();}
  function setQty(id, qty){const item=state.cart.find(x=>Number(x.id)===Number(id));if(!item)return;item.quantity=Math.max(1,Math.min(10,qty));save();renderCart();}
  function cartRows(){
    return state.cart.map(i=>({...i,product:findProduct(i.id)})).filter(x=>x.product);
  }
  function cartTotals(){
    const subtotal=cartRows().reduce((a,x)=>a+Number(x.product.price_inr)*x.quantity,0);
    const shipping=subtotal>=100000?0:(subtotal?499:0);
    return {subtotal,shipping,total:subtotal+shipping};
  }
  function renderCart(){
    const rows=cartRows(), el=$("#cartItems");
    if(!rows.length){el.innerHTML=`<div class="empty">Your cart is waiting for something beautiful.</div>`;}
    else el.innerHTML=rows.map(x=>`<div class="cart-line">
      <img src="${escapeHtml(x.product.image_url)}" alt="">
      <div><h4>${escapeHtml(x.product.name)}</h4><p>${money(x.product.price_inr)} · ${escapeHtml(x.product.purity)}</p>
      <div class="qty"><button data-qty="${x.id}" data-delta="-1">−</button><b>${x.quantity}</b><button data-qty="${x.id}" data-delta="1">+</button><button class="cart-remove" data-remove="${x.id}">Remove</button></div></div>
      <strong>${money(x.product.price_inr*x.quantity)}</strong>
    </div>`).join("");
    const t=cartTotals(); $("#cartSubtotal").textContent=money(t.subtotal);
    $("#checkoutTotal").textContent=money(t.total);
    $("#checkoutBtn").disabled=!rows.length;
    $("#checkoutBtn").style.opacity=rows.length?1:.5;
  }

  async function openProduct(slug){
    try{
      const p=await api("/api/products/"+encodeURIComponent(slug));
      $("#productDetail").innerHTML=`<div class="product-detail">
        <div class="detail-img"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}"></div>
        <div class="detail-copy"><p class="eyebrow">${escapeHtml(p.category)}</p><h2>${escapeHtml(p.name)}</h2>
        <div class="price"><strong>${money(p.price_inr)}</strong></div>
        <p>${escapeHtml(p.description)}</p>
        <div class="specs"><div><small>Purity</small><strong>${escapeHtml(p.purity)}</strong></div><div><small>Approx. weight</small><strong>${Number(p.weight_grams).toFixed(1)} g</strong></div><div><small>Metal</small><strong>${escapeHtml(p.metal)}</strong></div><div><small>Authenticity</small><strong>BIS / certificate as applicable</strong></div></div>
        <button class="btn gold wide" data-add="${p.id}">ADD TO CART</button>
        <p class="form-note">Final price, making charges, taxes and certificate details are verified before dispatch.</p></div></div>`;
      showModal("productModal");
    }catch(e){toast(e.message);}
  }

  function renderTrack(data){
    $("#trackResult").innerHTML=`<div class="track-card"><div><small>${escapeHtml(data.order_number)}</small><h3>${escapeHtml(data.customer_name)}</h3></div><p class="track-status">${escapeHtml(data.order_status)}</p><p>Total: <strong>${money(data.total_inr)}</strong></p><p class="muted">Payment: ${escapeHtml(data.payment_method)} · ${escapeHtml(data.payment_status)}</p></div>`;
  }

  document.addEventListener("click", e=>{
    const t=e.target.closest("button,a"); if(!t)return;
    if(t.matches("[data-close]")){closeModals();closeCart();return;}
    if(t.dataset.category!==undefined){state.category=t.dataset.category;state.search="";$("#searchInput").value="";$$(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter===state.category|| (state.category==="All"&&x.dataset.filter==="All")));loadProducts();document.querySelector("#collection").scrollIntoView({behavior:"smooth"});$("#nav").classList.remove("open");return;}
    if(t.dataset.filter!==undefined){state.category=t.dataset.filter;$$(".filter").forEach(x=>x.classList.toggle("active",x===t));loadProducts();return;}
    if(t.dataset.add){addCart(Number(t.dataset.add));return;}
    if(t.dataset.view){openProduct(t.dataset.view);return;}
    if(t.dataset.wish){const id=Number(t.dataset.wish);state.wishes=state.wishes.includes(id)?state.wishes.filter(x=>x!==id):[...state.wishes,id];save();renderProducts();return;}
    if(t.dataset.remove){removeCart(Number(t.dataset.remove));return;}
    if(t.dataset.qty){const id=Number(t.dataset.qty), item=state.cart.find(x=>Number(x.id)===id);setQty(id,(item?.quantity||1)+Number(t.dataset.delta));return;}
    if(t.dataset.scroll){$(t.dataset.scroll)?.scrollIntoView({behavior:"smooth"});return;}
    if(t.dataset.modal){showInfo(t.dataset.modal);return;}
  });

  $("#cartBtn").addEventListener("click",openCart);
  $("#backdrop").addEventListener("click",closeCart);
  $("#menuBtn").addEventListener("click",()=>$("#nav").classList.toggle("open"));
  $("#searchBtn").addEventListener("click",()=>{state.search=$("#searchInput").value.trim();state.category="All";loadProducts();$("#collection").scrollIntoView({behavior:"smooth"});});
  $("#searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("#searchBtn").click();});
  $("#allProductsBtn").addEventListener("click",()=>{state.category="All";state.search="";$("#searchInput").value="";loadProducts();});
  $("#wishlistBtn").addEventListener("click",()=>{
    const wished=state.products.filter(p=>state.wishes.includes(Number(p.id)));
    if(!wished.length){toast("Your wishlist is empty.");return;}
    state.search="";state.category="All";state.products=wished;renderProducts();$("#collection").scrollIntoView({behavior:"smooth"});toast("Showing your wishlist.");
  });
  $("#trackBtn").addEventListener("click",()=>{ $("#trackResult").innerHTML="";showModal("trackModal"); });
  $("#footerTrack").addEventListener("click",()=>{$("#trackBtn").click();});
  $("#checkoutBtn").addEventListener("click",()=>{closeCart();if(!state.cart.length)return;$("#checkoutTotal").textContent=money(cartTotals().total);showModal("checkoutModal");});
  $$(".pay-option").forEach(b=>b.addEventListener("click",()=>{$$(".pay-option").forEach(x=>x.classList.remove("active"));b.classList.add("active");$('input[name="payment_method"]').value=b.dataset.pay;}));
  $("#checkoutForm").addEventListener("submit",async e=>{
    e.preventDefault(); const form=e.currentTarget; const data=Object.fromEntries(new FormData(form).entries());
    data.items=state.cart.map(x=>({id:x.id,quantity:x.quantity}));
    const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent="PLACING ORDER…";
    try{
      const out=await api("/api/orders",{method:"POST",body:JSON.stringify(data)});
      if(data.payment_method==="RAZORPAY" && out.razorpay && window.Razorpay){
        const rzp=new Razorpay({
          key:out.razorpay.keyId, order_id:out.razorpay.orderId, amount:Math.round(out.total*100), currency:"INR",
          name:state.config.storeName, description:`Jewellery order ${out.orderNumber}`,
          prefill:{name:data.customer_name,email:data.email,contact:data.phone},
          theme:{color:"#d8ae4a"},
          handler:async response=>{
            try{
              await api("/api/payment/verify",{method:"POST",body:JSON.stringify({
                orderNumber:out.orderNumber,razorpayOrderId:response.razorpay_order_id,
                razorpayPaymentId:response.razorpay_payment_id,razorpaySignature:response.razorpay_signature
              })});
              state.cart=[];save();closeModals();renderCart();
              $("#infoContent").innerHTML=`<p class="eyebrow">PAYMENT CONFIRMED</p><h2>Thank you, ${escapeHtml(data.customer_name)}.</h2><p class="info-list">Order: <strong>${escapeHtml(out.orderNumber)}</strong></p><p class="info-list">Paid: <strong>${money(out.total)}</strong></p>`;
              showModal("infoModal");
            }catch(err){toast(err.message);}
          },
          modal:{ondismiss:()=>toast("Payment window closed. Your order is still pending payment.")}
        });
        rzp.open();
      } else {
        state.cart=[];save();closeModals();renderCart();
        $("#infoContent").innerHTML=`<p class="eyebrow">ORDER CONFIRMED</p><h2>Thank you, ${escapeHtml(data.customer_name)}.</h2><p class="info-list">Your order number is <strong>${escapeHtml(out.orderNumber)}</strong>.</p><p class="info-list">Total: <strong>${money(out.total)}</strong></p><p class="info-list">Keep the order number and phone number for tracking.</p>${out.whatsappUrl?`<a class="btn gold wide" href="${out.whatsappUrl}" target="_blank" rel="noopener">CONFIRM ON WHATSAPP</a>`:""}`;
        showModal("infoModal");
      }
    }catch(err){toast(err.message);}
    finally{btn.disabled=false;btn.textContent="PLACE ORDER";}
  });
  $("#trackForm").addEventListener("submit",async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const result=$("#trackResult");result.innerHTML="<p class='muted'>Checking…</p>";
    try{const data=await api(`/api/orders/${encodeURIComponent(f.get("orderNumber"))}?phone=${encodeURIComponent(f.get("phone"))}`);renderTrack(data);}
    catch(err){result.innerHTML=`<div class="track-card">${escapeHtml(err.message)}</div>`;}
  });
  $("#whatsappBtn").addEventListener("click",()=>window.open("/api/whatsapp?message="+encodeURIComponent("Hello Milestone Enterprises, I need help choosing jewellery."),"_blank"));
  $("#footerWhatsApp").addEventListener("click",()=>$("#whatsappBtn").click());
  $("#rateBtn").addEventListener("click",()=>showInfo("rate"));
  $("#aboutBtn").addEventListener("click",()=>showInfo("about"));
  $$("#newsletterForm").forEach(f=>f.addEventListener("submit",e=>{e.preventDefault();f.reset();toast("Thank you — you're subscribed.");}));

  function showInfo(type){
    const content={
      about:`<p class="eyebrow">OUR PROMISE</p><h2>Made for your milestones.</h2><ul class="info-list"><li>Transparent product information and verified final pricing before dispatch.</li><li>Hallmark/certificate details are provided where applicable.</li><li>Dedicated assistance for sizing, gifting and bridal selections.</li></ul>`,
      policies:`<p class="eyebrow">STORE POLICIES</p><h2>Shipping & exchange</h2><ul class="info-list"><li>Insured shipping is available across India.</li><li>Eligible exchanges are subject to product condition and store policy.</li><li>Final pricing, making charges and taxes are confirmed before dispatch.</li><li>For returns/exchanges, contact the store using the details shown on this website.</li></ul>`,
      terms:`<p class="eyebrow">TERMS</p><h2>Terms & conditions</h2><ul class="info-list"><li>Product images are representative; slight differences can occur.</li><li>Jewellery prices may change with metal rates and final weight.</li><li>Orders are confirmed only after store verification.</li><li>Never share payment passwords, OTPs or card PINs with anyone claiming to represent the store.</li></ul>`,
      rate:`<p class="eyebrow">GOLD RATE</p><h2>Indicative rates</h2><p class="info-list">The homepage figures are illustrative until a verified live gold-rate feed is connected. Final jewellery pricing depends on purity, net weight, making charges, stone value, taxes and the store's current rate.</p>`
    };
    $("#infoContent").innerHTML=content[type]||content.about;showModal("infoModal");
  }

  $("#year").textContent=new Date().getFullYear();
  updateCounts(); loadConfig(); loadProducts();
})();