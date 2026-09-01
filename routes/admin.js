var express = require("express");
var exe = require("../conn");
var router = express.Router();

// ------------------- DASHBOARD -------------------
// router.get("/",async (req, res) => {
//     {
//         var dates={};
//         for(var i=0;i<30;i++){
//           dates.push(new Date(Date.now() - (i * 24 * 60 * 60 * 1000).toLocaleString("en-CA")));  
//           var sql=`SELECT sum(total_amount) as total FROM orders WHERE order_date =?";
//           var oorder_count = await exe(sql,[dates[i]]);
//           order_counts.push(order_count[0].total||0);
//     }
//     var packet={dates,order_counts};
//     console.log(dates);

//     res.render("admin/index");
// });
router.get("/", async (req, res) => {
    let dates = [];
    let order_counts = [];

    // last 7 days
    for (let i = 3; i >= 0; i--) {
        let date = new Date();
        date.setDate(date.getDate() - i);
        let dateStr = date.toISOString().split('T')[0];
        dates.push(dateStr);

        // check orders for this date
        const result = await exe(
            "SELECT SUM(total_amount) AS total FROM orders WHERE DATE(order_date) = ?",
            [dateStr]
        );

        // if no orders push dummy number 0
        order_counts.push(result[0].total || 0);
    }

    res.render("admin/index", { dates, order_counts });
});




// ------------------- CATEGORY -------------------

// List Category
router.get("/category", async (req, res) => {
    let sql = "SELECT * FROM category";
    let categories = await exe(sql);
    res.render("admin/category", { categories });
});

// Add Category
router.post("/save_category", async (req, res) => {
    let d = req.body;
    let file_name = "";

    if (req.files && req.files.category_image) {
        file_name = Date.now() + "_" + req.files.category_image.name.replace(/\s/g, "_");
        await req.files.category_image.mv("./public/uploads/" + file_name);
    }

    let sql = `INSERT INTO category (category_name, category_image, category_status)
               VALUES (?, ?, ?)`;
    await exe(sql, [d.category_name, file_name, d.category_status]);

    res.redirect("/admin/category");
});

// Edit Category
router.get("/edit_category/:id", async (req, res) => {
    const { id } = req.params;
    let sql = "SELECT * FROM category WHERE category_id = ?";
    let category = await exe(sql, [id]);

    if (!category || category.length === 0) {
        return res.send("Category not found");
    }

    res.render("admin/edit_category", { category: category[0] });
});

// Update Category
router.post("/update_category/:id", async (req, res) => {
    const { id } = req.params;
    const d = req.body;
    let file_name = d.old_image;

    if (req.files && req.files.category_image) {
        file_name = Date.now() + "_" + req.files.category_image.name;
        await req.files.category_image.mv("./public/uploads/" + file_name);
    }

    let sql = `UPDATE category SET category_name=?, category_image=?, category_status=? WHERE category_id=?`;
    await exe(sql, [d.category_name, file_name, d.category_status, id]);

    res.redirect("/admin/category");
});

// Delete Category
router.get("/delete_category/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await exe("DELETE FROM products WHERE category_id = ?", [id]);
        await exe("DELETE FROM category WHERE category_id = ?", [id]);
        res.redirect("/admin/category");
    } catch (err) {
        console.error(err);
        res.send("Error deleting category: " + err.sqlMessage);
    }
});

// ------------------- PRODUCTS -------------------

// Products page
router.get("/products", async (req, res) => {
    var categories = await exe("SELECT * FROM category");
    res.render("admin/products", { categories });
});

// Save Product
router.post("/save_product", async (req, res) => {
    var d = req.body;
    var file_name = "";

    if (req.files && req.files.product_main_image) {
        var product_main_image = req.files.product_main_image;
        file_name = product_main_image.name;
        await product_main_image.mv("./public/uploads/" + file_name);
    }

    var sql = `
        INSERT INTO products
        (product_name, category_id, product_brand, product_details, product_colors, product_main_image, is_highlighted, is_most_selling)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await exe(sql, [
        d.product_name,
        d.category_id,
        d.product_brand,
        d.product_details,
        d.product_colors,
        file_name,
        d.is_highlighted,
        d.is_most_selling
    ]);

    res.redirect("/admin/products");
});

// Products List
router.get("/products_list", async (req, res) => {
    var products = await exe("SELECT * FROM products");
    res.render("admin/products_list", { products });
});

// Edit Product
router.get("/edit_product/:id", async (req, res) => {
    const { id } = req.params;
    const product = await exe("SELECT * FROM products WHERE product_id = ?", [id]);
    const categories = await exe("SELECT * FROM category");

    if (!product || product.length === 0) return res.send("Product not found");

    res.render("admin/edit_product", { product: product[0], categories });
});

// Update Product
router.post("/update_product/:id", async (req, res) => {
    const productId = req.params.id;
    const d = req.body;
    let file_name = d.old_image;

    if (req.files && req.files.product_main_image) {
        const product_main_image = req.files.product_main_image;
        file_name = Date.now() + "_" + product_main_image.name.replace(/\s/g, "_");
        await product_main_image.mv("./public/uploads/" + file_name);
    }

    const sql = `
        UPDATE products
        SET product_name = ?, category_id = ?, product_brand = ?, product_details = ?, product_colors = ?, product_main_image = ?, is_highlighted = ?, is_most_selling = ?
        WHERE product_id = ?
    `;

    await exe(sql, [
        d.product_name,
        d.category_id,
        d.product_brand,
        d.product_details,
        d.product_colors,
        file_name,
        d.is_highlighted,
        d.is_most_selling,
        productId
    ]);

    res.redirect("/admin/products_list");
});

// Delete Product
router.get("/delete_product/:id", async (req, res) => {
    const productId = req.params.id;
    await exe("DELETE FROM products WHERE product_id = ?", [productId]);
    res.redirect("/admin/products_list");
});

// ------------------- PRODUCT VARIANTS -------------------

// Add Product Variants page
router.get("/add_product_variants/:product_id", async (req, res) => {
    const { product_id } = req.params;
    const product_result = await exe("SELECT * FROM products WHERE product_id = ?", [product_id]);
    const product = product_result[0];
    const variants = await exe("SELECT * FROM product_variants WHERE product_id = ?", [product_id]);
    res.render("admin/add_product_variants", { product, variants });
});

// Save Product Variant
router.post("/save_product_variants", async (req, res) => {
    const d = req.body;
    let file_name = "";

    if (req.files && req.files.image) {
        const image = req.files.image;
        file_name = image.name;
        await image.mv("./public/uploads/" + file_name);
    }

    const sql = `
        INSERT INTO product_variants
        (product_id, variation_title, available_stock, variation_market_price, variation_price, image)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    await exe(sql, [
        d.product_id,
        d.variation_title,
        d.available_stock,
        d.variation_market_price,
        d.variation_price,
        file_name
    ]);

    res.redirect("/admin/add_product_variants/" + d.product_id);
});

// Edit Product Variant
router.get("/edit_product_variant/:product_id/:variant_id", async (req, res) => {
    const { product_id, variant_id } = req.params;
    let product = await exe("SELECT * FROM products WHERE product_id = ?", [product_id]);
    let variant = await exe("SELECT * FROM product_variants WHERE product_variant_id = ? AND product_id = ?", [variant_id, product_id]);

    if (!variant || variant.length === 0) return res.send("Variant not found");

    res.render("admin/edit_product_variant", { product: product[0], variant: variant[0] });
});

// Update Product Variant
router.post("/update_product_variant/:product_id/:variant_id", async (req, res) => {
    const { product_id, variant_id } = req.params;
    const d = req.body;
    let file_name = d.old_image;

    if (req.files && req.files.image) {
        file_name = Date.now() + "_" + req.files.image.name;
        await req.files.image.mv("./public/uploads/" + file_name);
    }

    let sql = `UPDATE product_variants 
               SET variation_title=?, available_stock=?, variation_market_price=?, variation_price=?, image=?
               WHERE product_variant_id=? AND product_id=?`;

    await exe(sql, [d.variation_title, d.available_stock, d.variation_market_price, d.variation_price, file_name, variant_id, product_id]);
    res.redirect("/admin/add_product_variants/" + product_id);
});

// Delete Product Variant
router.get("/delete_product_variant/:product_id/:variant_id", async (req, res) => {
    const { product_id, variant_id } = req.params;
    await exe("DELETE FROM product_variants WHERE product_variant_id = ?", [variant_id]);
    res.redirect("/admin/add_product_variants/" + product_id);
});

// ------------------- SLIDER -------------------




// Show slider page
router.get("/slider", async (req, res) => {
    const sliders = await exe("SELECT * FROM slider");
    res.render("admin/slider", { sliders });
});

// Save new slider
router.post("/save_slider", async (req, res) => {
    if (!req.files || !req.files.slider_image)
        return res.send("Please upload an image");

    var file_name = Date.now() + "_" + req.files.slider_image.name;
    await req.files.slider_image.mv("./public/uploads/" + file_name);

    var { slider_title, slider_description, slider_button_text, slider_button_link } = req.body;

    var sql = `INSERT INTO slider 
        (slider_image, slider_title, slider_description, slider_button_text, slider_button_link) 
        VALUES (?, ?, ?, ?, ?)`;

    await exe(sql, [file_name, slider_title, slider_description, slider_button_text, slider_button_link]);
    res.redirect("/admin/slider");
});

// ------------------- MULTIPLE PRODUCT IMAGES -------------------
router.get("/add_product_images/:product_id", async (req, res) => {
    const { product_id } = req.params;
    res.render("admin/add_product_images", { product_id });
});

router.post("/add_product_images/:product_id", async (req, res) => {
    const { product_id } = req.params;

    if (req.files && req.files.product_images) {
        let files = req.files.product_images;
        if (!Array.isArray(files)) files = [files];

        for (let file of files) {
            let file_name = Date.now() + "_" + file.name.replace(/\s/g, "_");
            await file.mv("./public/uploads/" + file_name);

            await exe("INSERT INTO product_images (product_id, image_path) VALUES (?, ?)", [product_id, file_name]);
        }
    }

    res.redirect("/admin/products_list");
});

// ------------------- ORDERS -------------------

// Pending Orders
router.get("/pending_orders", async (req, res) => {
    const orders = await exe("SELECT * FROM orders WHERE order_status='pending'");
    res.render("admin/pending_orders", { orders });
});



// Cancelled Orders







router.get("/cancelled_orders", async (req, res) => {
    const orders = await exe("SELECT * FROM orders WHERE order_status='cancelled'");
    res.render("admin/cancelled_orders", { orders });
});























// Order Details Page
router.get("/order_details/:order_id", async (req, res) => {
    const { order_id } = req.params;

    const orders = await exe("SELECT * FROM orders WHERE order_id = ?", [order_id]);
    if (orders.length === 0) return res.send("Order not found!");

    const orderItems = await exe(`
        SELECT 
            oi.*, 
            p.product_main_image AS product_image, 
            p.product_colors AS product_color, 
            p.product_name,
            pv.variation_title,
            pv.variation_price,
            pv.variation_market_price,
            pv.image AS variant_image
        FROM order_products oi
        JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.product_variant_id
        WHERE oi.order_id = ?
    `, [order_id]);

    res.render("admin/order_details", { order: orders[0], orderItems });
});

// Dispatch Order

router.get("/dispatch_orders", async (req, res) => {
    const orders = await exe("SELECT * FROM orders WHERE order_status='Dispatched'");
    res.render("admin/dispatch_orders", { orders }); // 👈 dispatch_orders.ejs file render hote
});




// Delivered Orders
router.get("/delivered_orders", async (req, res) => {
    const orders = await exe("SELECT * FROM orders WHERE order_status='Delivered'");
    res.render("admin/orders", { orders, page_title: "Delivered Orders" });
});

// Returned Orders
router.get("/return_orders", async (req, res) => {
    const orders = await exe("SELECT * FROM orders WHERE order_status='Return'");
    res.render("admin/orders", { orders, page_title: "Returned Orders" });
});

// Refunded Orders
router.get("/refund_orders", async (req, res) => {
    const orders = await exe("SELECT * FROM orders WHERE order_status='Refund'");
    res.render("admin/orders", { orders, page_title: "Refunded Orders" });
});

// Rejected / Cancelled Orders (last 30 days)
router.get("/rejected_orders", async (req, res) => {
    const orders = await exe(`
        SELECT * FROM orders 
        WHERE order_status IN ('Cancelled', 'Returned', 'Refund')
        AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);
    res.render("admin/orders", { orders, page_title: "Rejected Orders" });
});

router.get("/settings", function (req, res) {
    res.render("admin/setting");
});




router.get("/login", function (req, res) {
    res.render("admin/login"); // login.ejs chi file admin folder madhe hava
});

// Admin Login Form Submit
router.post("/login", function (req, res) {
    const { email, password } = req.body;

    // Dummy check (real project madhe DB check karaycha)
    if (email === "admin@example.com" && password === "admin123") {
        // login success
        res.redirect("/admin/dashboard");
    } else {
        // login fail
        res.render("admin/login", { error: "Invalid email or password" });
    }
});

// Admin Dashboard
router.get("/dashboard", function (req, res) {
    res.render("admin/dashboard"); // dashboard.ejs chi file admin folder madhe hava
});


router.get("/logout", function (req, res) {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.render("admin/logout"); // logout.ejs render hoil
    });
});










// Portfolio List
router.get("/portfolio", async (req, res) => {
    const projects = await exe("SELECT * FROM portfolio");
    res.render("admin/portfolio_list", { projects });
});

// Add Portfolio form

router.get("/add_portfolio", (req, res) => {
    res.render("admin/add_portfolio");
});

router.post("/add_portfolio", async (req, res) => {
    const d = req.body;
    let main_image = "";

    if (req.files && req.files.main_image) {
        main_image = Date.now() + "_" + req.files.main_image.name.replace(/\s/g, "_");
        await req.files.main_image.mv("./public/uploads/" + main_image);
    }

    const sql = `INSERT INTO portfolio (title, short_desc, category, main_image) VALUES (?, ?, ?, ?)`;
    await exe(sql, [d.title, d.short_desc, d.category, main_image]);

    res.redirect("/admin/portfolio");
});

router.get("/edit_portfolio/:id", async (req, res) => {
    const { id } = req.params;
    const project = await exe("SELECT * FROM portfolio WHERE id = ?", [id]);
    if (!project || project.length === 0) return res.send("Project not found");
    res.render("admin/edit_portfolio", { project: project[0] });
});

router.post("/update_portfolio/:id", async (req, res) => {
    const { id } = req.params;
    const d = req.body;
    let main_image = d.old_image;

    if (req.files && req.files.main_image) {
        main_image = Date.now() + "_" + req.files.main_image.name.replace(/\s/g, "_");
        await req.files.main_image.mv("./public/uploads/" + main_image);
    }

    const sql = `
        UPDATE portfolio
        SET title = ?, short_desc = ?, category = ?, main_image = ?
        WHERE id = ?
    `;
    await exe(sql, [d.title, d.short_desc, d.category, main_image, id]);
    res.redirect("/admin/portfolio");
});



// ------------------- VERIFY PAYMENT -------------------

router.post("/verify-payment/:id", async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Verify Payment ID:", id);
        console.log("Payment Data:", req.body);

        // येथे तुमची payment verification logic येईल

        res.json({
            success: true,
            message: "Payment verified successfully",
            id: id
        });

    } catch (error) {
        console.error("Payment verification error:", error);

        res.status(500).json({
            success: false,
            message: "Payment verification failed"
        });
    }
});

module.exports = router;
