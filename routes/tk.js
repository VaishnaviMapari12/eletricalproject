const express = require("express");
const exe = require("../conn");  
const router = express.Router();

// ===== Dashboard =====
router.get("/", (req, res) => {
    res.render("admin/index");
});

// ===== Category =====
// List categories
router.get("/category", async (req, res) => {
    const categories = await exe("SELECT * FROM category");
    res.render("admin/category", { categories });
});

// Add Category
router.post("/save_category", async (req, res) => {
    const d = req.body;
    let file_name = "";
    if(req.files && req.files.category_image){
        file_name = Date.now() + "_" + req.files.category_image.name.replace(/\s/g,"_");
        await req.files.category_image.mv("./public/uploads/" + file_name);
    }
    await exe("INSERT INTO category (category_name, category_image, category_status) VALUES (?,?,?)",
        [d.category_name, file_name, d.category_status]
    );
    res.redirect("/admin/category");
});

// Edit Category
router.get("/edit_category/:id", async (req,res)=>{
    const category = await exe("SELECT * FROM category WHERE category_id=?", [req.params.id]);
    if(!category.length) return res.send("Category not found");
    res.render("admin/edit_category", { category: category[0] });
});

// Update Category
router.post("/update_category/:id", async (req,res)=>{
    const d = req.body;
    let file_name = d.old_image;
    if(req.files && req.files.category_image){
        file_name = Date.now() + "_" + req.files.category_image.name.replace(/\s/g,"_");
        await req.files.category_image.mv("./public/uploads/" + file_name);
    }
    await exe("UPDATE category SET category_name=?, category_image=?, category_status=? WHERE category_id=?",
        [d.category_name, file_name, d.category_status, req.params.id]
    );
    res.redirect("/admin/category");
});

// Delete Category
router.get("/delete_category/:id", async (req,res)=>{
    const id = req.params.id;
    try{
        await exe("DELETE FROM products WHERE category_id=?", [id]); // delete dependent products
        await exe("DELETE FROM category WHERE category_id=?", [id]);
        res.redirect("/admin/category");
    }catch(err){
        console.error(err);
        res.send("Error deleting category: " + err.sqlMessage);
    }
});

// ===== Products =====
// Show Add Product form
router.get("/products", async (req,res)=>{
    const categories = await exe("SELECT * FROM category");
    res.render("admin/products", { categories });
});

// Save Product
router.post("/save_product", async (req,res)=>{
    const d = req.body;
    let file_name = "";
    if(req.files && req.files.product_main_image){
        file_name = Date.now() + "_" + req.files.product_main_image.name.replace(/\s/g,"_");
        await req.files.product_main_image.mv("./public/uploads/" + file_name);
    }
    await exe(`
        INSERT INTO products (product_name, category_id, product_brand, product_details, product_colors, product_main_image, is_highlighted, is_most_selling)
        VALUES (?,?,?,?,?,?,?,?)
    `, [d.product_name, d.category_id, d.product_brand, d.product_details, d.product_colors, file_name, d.is_highlighted, d.is_most_selling]);
    res.redirect("/admin/products");
});

// List products
router.get("/products_list", async (req,res)=>{
    const products = await exe("SELECT * FROM products");
    res.render("admin/products_list", { products });
});

// Edit Product
router.get("/edit_product/:id", async (req,res)=>{
    const product = await exe("SELECT * FROM products WHERE product_id=?", [req.params.id]);
    const categories = await exe("SELECT * FROM category");
    if(!product.length) return res.send("Product not found");
    res.render("admin/edit_product", { product: product[0], categories });
});

// Update Product
router.post("/update_product/:id", async (req,res)=>{
    const d = req.body;
    let file_name = d.old_image;
    if(req.files && req.files.product_main_image){
        file_name = Date.now() + "_" + req.files.product_main_image.name.replace(/\s/g,"_");
        await req.files.product_main_image.mv("./public/uploads/" + file_name);
    }
    await exe(`
        UPDATE products SET product_name=?, category_id=?, product_brand=?, product_details=?, product_colors=?, product_main_image=?, is_highlighted=?, is_most_selling=? WHERE product_id=?
    `, [d.product_name, d.category_id, d.product_brand, d.product_details, d.product_colors, file_name, d.is_highlighted, d.is_most_selling, req.params.id]);
    res.redirect("/admin/products_list");
});

// Delete Product
router.get("/delete_product/:id", async (req,res)=>{
    await exe("DELETE FROM products WHERE product_id=?", [req.params.id]);
    res.redirect("/admin/products_list");
});

// ===== Product Variants =====
router.get("/add_product_variants/:product_id", async (req,res)=>{
    const product = (await exe("SELECT * FROM products WHERE product_id=?", [req.params.product_id]))[0];
    const variants = await exe("SELECT * FROM product_variants WHERE product_id=?", [req.params.product_id]);
    res.render("admin/add_product_variants", { product, variants });
});

router.post("/save_product_variants", async (req,res)=>{
    const d = req.body;
    let file_name = "";
    if(req.files && req.files.image){
        file_name = Date.now() + "_" + req.files.image.name.replace(/\s/g,"_");
        await req.files.image.mv("./public/uploads/" + file_name);
    }
    await exe(`
        INSERT INTO product_variants (product_id, variation_title, available_stock, variation_market_price, variation_price, image)
        VALUES (?,?,?,?,?,?)
    `, [d.product_id, d.variation_title, d.available_stock, d.variation_market_price, d.variation_price, file_name]);
    res.redirect("/admin/add_product_variants/" + d.product_id);
});

// Edit Product Variant
router.get("/edit_product_variant/:product_id/:variant_id", async (req,res)=>{
    const product = (await exe("SELECT * FROM products WHERE product_id=?", [req.params.product_id]))[0];
    const variant = (await exe("SELECT * FROM product_variants WHERE product_variant_id=? AND product_id=?", [req.params.variant_id, req.params.product_id]))[0];
    res.render("admin/edit_product_variant", { product, variant });
});

// Update Variant
router.post("/update_product_variant/:product_id/:variant_id", async (req,res)=>{
    const d = req.body;
    let file_name = d.old_image;
    if(req.files && req.files.image){
        file_name = Date.now() + "_" + req.files.image.name.replace(/\s/g,"_");
        await req.files.image.mv("./public/uploads/" + file_name);
    }
    await exe(`
        UPDATE product_variants SET variation_title=?, available_stock=?, variation_market_price=?, variation_price=?, image=? 
        WHERE product_variant_id=? AND product_id=?
    `, [d.variation_title, d.available_stock, d.variation_market_price, d.variation_price, file_name, req.params.variant_id, req.params.product_id]);
    res.redirect("/admin/add_product_variants/" + req.params.product_id);
});

// Delete Variant
router.get("/delete_product_variant/:product_id/:variant_id", async (req,res)=>{
    await exe("DELETE FROM product_variants WHERE product_variant_id=?", [req.params.variant_id]);
    res.redirect("/admin/add_product_variants/" + req.params.product_id);
});

// ===== Slider =====
router.get("/silder", async (req,res)=>{
    const sliders = await exe("SELECT * FROM slider");
    res.render("admin/slider", { sliders });
});

router.post("/save_slider", async (req,res)=>{
    if(!req.files || !req.files.slider_image) return res.send("Please upload image");
    const file_name = Date.now() + "_" + req.files.slider_image.name.replace(/\s/g,"_");
    await req.files.slider_image.mv("./public/uploads/" + file_name);
    const { slider_title, slider_description, slider_button_text, slider_button_link } = req.body;
    await exe("INSERT INTO slider (slider_image, slider_title, slider_description, slider_button_text, slider_button_link) VALUES (?,?,?,?,?)",
        [file_name, slider_title, slider_description, slider_button_text, slider_button_link]);
    res.redirect("/admin/slider");
});

// ===== Orders =====
const orderStatuses = ["pending","dispatch","delivered","cancelled","return","refund"];
orderStatuses.forEach(status=>{
    router.get(`/${status}_orders`, async (req,res)=>{
        const orders = await exe("SELECT * FROM orders WHERE order_status=?", [status]);
        res.render("admin/orders", { orders });
    });
});

// Order Details
router.get("/order_details/:order_id", async (req,res)=>{
    const { order_id } = req.params;
    const order = (await exe("SELECT * FROM orders WHERE order_id=?", [order_id]))[0];
    const orderItems = await exe(`
        SELECT p.product_name, pv.variation_title, op.quantity, op.price, op.total_price
        FROM order_products op
        JOIN products p ON op.product_id=p.product_id
        LEFT JOIN product_variants pv ON op.variant_id=pv.product_variant_id
        WHERE op.order_id=?
    `, [order_id]);
    res.render("admin/order_details", { order, orderItems });
});

module.exports = router;
