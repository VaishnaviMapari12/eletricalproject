var express = require("express");
var router = express.Router();
var exe = require("../conn"); // MySQL query function
var Razorpay = require("razorpay");  // ✅ बरोबर
const sendOtpEmail = require("../emailer/eamil");

// // ================== Homepage ==================
// router.get("/", async (req, res) => {
//   const sliders = await exe("SELECT * FROM slider") || [];
//   const categories = await exe("SELECT * FROM category WHERE category_status='active'") || [];
//   const most_selling_products = await exe(`
//     SELECT p.*, v.*
//     FROM products p
//     LEFT JOIN product_variants v ON p.product_id = v.product_id
//     WHERE p.is_most_selling = 'yes'
//   `) || [];
//   const products = await exe("SELECT * FROM products") || [];

//   res.render("user/index", {
//     sliders,
//     categories,
//     most_selling_products,
//     products,
//     req
//   });
// });

router.get('/', async (req, res) => {
    // Sliders
    const sliders = await exe("SELECT * FROM slider") || [];

    // Categories (active only)
    const categories = await exe("SELECT * FROM category WHERE category_status='active'") || [];

    // Most Selling Products with variant info
    const most_selling_products = await exe(`
        SELECT 
            p.*, 
            v.product_variant_id, 
            v.variation_price, 
            v.variation_market_price, 
            v.image AS variant_image, 
            v.available_stock
        FROM products p
        LEFT JOIN product_variants v ON p.product_id = v.product_id
        WHERE p.is_most_selling = 'yes'
    `) || [];

    // Highlighted Products with variant info
    const highlightedProducts = await exe(`
        SELECT 
            p.*, 
            v.product_variant_id, 
            v.variation_price, 
            v.variation_market_price, 
            v.image AS variant_image, 
            v.available_stock
        FROM products p
        LEFT JOIN product_variants v ON p.product_id = v.product_id
        WHERE p.is_highlighted = 'yes'
    `) || [];

    res.render('user/index', {
        sliders,
        categories,
        most_selling_products,
        highlightedProducts,
        req
    });
});


// ================== Products List ==================
// Route for /products
// router.get("/products", async (req, res) => {
//   const category_id = req.query.category || null; // query param name
//   const selectedPrice = req.query.price || null;
//   const selectedRating = req.query.rating || null;
//   const selectedSort = req.query.sort || "featured";

//   let sql = `
//     SELECT 
//       p.*, 
//       v.product_variant_id, 
//       v.variation_price, 
//       v.variation_market_price, 
//       v.image AS variant_image, 
//       c.category_name
//     FROM products p
//     LEFT JOIN product_variants v ON p.product_id = v.product_id
//     LEFT JOIN category c ON p.category_id = c.category_id
//     WHERE 1=1
//   `;
//   const params = [];

//   if (category_id) {
//     sql += " AND p.category_id = ?";
//     params.push(category_id);
//   }

//   if (selectedPrice === "0-100") sql += " AND v.variation_price <= 100";
//   else if (selectedPrice === "100-500") sql += " AND v.variation_price BETWEEN 100 AND 500";
//   else if (selectedPrice === "500-1000") sql += " AND v.variation_price BETWEEN 500 AND 1000";
//   else if (selectedPrice === "1000+") sql += " AND v.variation_price >= 1000";

//   if (selectedRating) {
//     sql += " AND p.rating >= ?";
//     params.push(selectedRating);
//   }

//   if (selectedSort === "price-low") sql += " ORDER BY v.variation_price ASC";
//   else if (selectedSort === "price-high") sql += " ORDER BY v.variation_price DESC";
//   else if (selectedSort === "rating") sql += " ORDER BY p.rating DESC";
//   else if (selectedSort === "newest") sql += " ORDER BY p.created_at DESC";
//   else sql += " ORDER BY p.product_id DESC";

//   const products = await exe(sql, params) || [];
//   const categories = await exe("SELECT * FROM category WHERE category_status='active'") || [];

//   res.render("user/products", {
//     products,
//     categories,
//     selectedCategory: category_id,
//     selectedPrice,
//     selectedRating,
//     selectedSort,
//     req
//   });
// });

// // Optional: Keep /product route as alias
// router.get("/product", (req, res) => {
//   res.redirect("/products"); 
// });




// // Products List
router.get("/products", async (req, res) => {
    try {
        const category_id = req.query.category_id || null;
        const selectedPrice = req.query.price || null;
        const selectedRating = req.query.rating || null;
        const selectedSort = req.query.sort || "featured";

        let sql = `
            SELECT 
                p.*,
                v.product_variant_id,
                v.variation_price,
                v.variation_market_price,
                v.image AS variant_image,
                v.available_stock,
                c.category_name
            FROM products p
            LEFT JOIN product_variants v 
                ON p.product_id = v.product_id
            LEFT JOIN category c 
                ON p.category_id = c.category_id
            WHERE 1=1
        `;

        const params = [];

        if (category_id) {
            sql += ` AND p.category_id = ?`;
            params.push(category_id);
        }

        if (selectedPrice === "0-100") {
            sql += ` AND v.variation_price <= 100`;
        }
        else if (selectedPrice === "100-500") {
            sql += ` AND v.variation_price BETWEEN 100 AND 500`;
        }
        else if (selectedPrice === "500-1000") {
            sql += ` AND v.variation_price BETWEEN 500 AND 1000`;
        }
        else if (selectedPrice === "1000+") {
            sql += ` AND v.variation_price >= 1000`;
        }

        if (selectedRating) {
            sql += ` AND p.rating >= ?`;
            params.push(selectedRating);
        }

        if (selectedSort === "price-low") {
            sql += ` ORDER BY v.variation_price ASC`;
        }
        else if (selectedSort === "price-high") {
            sql += ` ORDER BY v.variation_price DESC`;
        }
        else if (selectedSort === "rating") {
            sql += ` ORDER BY p.rating DESC`;
        }
        else if (selectedSort === "newest") {
            sql += ` ORDER BY p.created_at DESC`;
        }
        else {
            sql += ` ORDER BY p.product_id DESC`;
        }

        const products = await exe(sql, params);
        const categories = await exe(
            "SELECT * FROM category WHERE category_status='active'"
        );

        res.render("user/products", {
            products: products || [],
            categories: categories || [],
            selectedCategory: category_id,
            selectedPrice,
            selectedRating,
            selectedSort,
            req
        });

    } catch (error) {
        console.error("PRODUCTS ERROR:", error);
        res.status(500).send("Database Error");
    }
});

router.get("/product", (req, res) => {
    res.redirect("/products");
});



// // ================== Product Details ==================
// async function renderProductDetails(req, res, product_id, variant_id = null, color = null) {
//   const product = await exe("SELECT * FROM products WHERE product_id = ?", [product_id]);
//   const product_variants = await exe("SELECT * FROM product_variants WHERE product_id = ?", [product_id]);

//   const selected_variant_id = variant_id || (product_variants.length ? product_variants[0].product_variant_id : null);
//   const selected_variant = selected_variant_id
//     ? (await exe("SELECT * FROM product_variants WHERE product_variant_id = ?", [selected_variant_id]))[0]
//     : null;

//   const images = await exe("SELECT * FROM product_images WHERE product_id = ?", [product_id]);

//   let selected_color = color || (product[0].product_colors ? product[0].product_colors.split(",")[0].trim() : null);

//   let cart = [];
//   if (req.session.user_id && selected_variant_id && selected_color) {
//     cart = await exe(
//       "SELECT * FROM cart WHERE user_id=? AND product_id=? AND variant_id=? AND color=?",
//       [req.session.user_id, product_id, selected_variant_id, selected_color]
//     );
//   }

//   res.render("user/product_details", {
//     product,
//     product_variants,
//     selected_variant,
//     images,
//     req,
//     cart,
//     color: selected_color
//   });
// }



async function renderProductDetails(req, res) {
    const product_id = req.params.product_id;
    const variation_id = req.query.variant_id || null;
    const color_query = req.query.color || null;

    // Fetch product
    const product = await exe("SELECT * FROM products WHERE product_id = ?", [product_id]);
    if (!product.length) return res.redirect('/products'); // product not found

    // Fetch product images
    const images = await exe("SELECT * FROM product_images WHERE product_id = ?", [product_id]);

    // Fetch all variants
    const product_variants = await exe("SELECT * FROM product_variants WHERE product_id = ?", [product_id]);

    // Determine selected variant
    let selected_variant = null;
    if (variation_id) {
        const variant = await exe("SELECT * FROM product_variants WHERE product_variant_id = ?", [variation_id]);
        selected_variant = variant.length ? variant[0] : null;
    }
    if (!selected_variant) {
        selected_variant = product_variants.length ? product_variants[0] : null;
    }

    // Determine selected color
    let selected_color = color_query;
    if (!selected_color && product[0].product_colors) {
        selected_color = product[0].product_colors.split(",")[0].trim();
    }

    // Check cart for logged-in user
    let cart = [];
    if (req.session.user_id && selected_variant && selected_color) {
        cart = await exe(
            "SELECT * FROM cart WHERE user_id=? AND product_id=? AND variant_id=? AND color=?",
            [req.session.user_id, product_id, selected_variant.product_variant_id, selected_color]
        );
    }

    // User object
    const user = req.session.user_id ? { id: req.session.user_id } : null;

    // Render the EJS page
    res.render("user/product_details", {
        product,
        images,
        product_variants,
        selected_variant,
        cart,
        color: selected_color,
        user
    });
}




// Product details routes
router.get("/product_details/:product_id", async (req, res) => {
    const { product_id } = req.params;
    const { color, variant_id } = req.query;
    await renderProductDetails(req, res, product_id, variant_id, color);
});

router.get("/product_details/:product_id/:variant_id", async (req, res) => {
    const { product_id, variant_id } = req.params;
    const { color } = req.query;
    await renderProductDetails(req, res, product_id, variant_id, color);
});


router.get('/update_cart/:product_id/:variant_id/:color/:quantity', async (req, res) => {
    // update cart logic
    await exe("UPDATE cart SET quantity=? WHERE user_id=? AND product_id=? AND variant_id=? AND color=?",
        [req.params.quantity, req.session.user_id, req.params.product_id, req.params.variant_id, req.params.color]
    );
    res.json({ success: true });
});


// ================== Account 

router.get("/create-account", (req, res) => {
    res.render("user/create_account");
});

// Save account data
router.post("/save_account", (req, res) => {
    var d = req.body;

    var sql = `INSERT INTO users 
    (first_name, last_name, email, password, confirm_password, date_of_birth, newsletter) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

    var values = [
        d.first_name,
        d.last_name,
        d.email,
        d.password,
        d.confirm_password,
        d.date_of_birth,
        d.newsletter ? 1 : 0
    ];

    exe(sql, values)
        .then(() => {
            res.send("Account created successfully!");
        })
        .catch(err => {
            console.error("MYSQL ERROR:", err);
            res.status(500).send("Error saving account");
        });
});

// ================== Login ==================
router.get("/login", (req, res) => {
    res.render("user/login", { req });
});

router.post("/login", async (req, res) => {
    const d = req.body;
    const sql = `SELECT * FROM users WHERE email=? AND password=?`;
    const data = await exe(sql, [d.email, d.password]);

    if (data.length > 0) {
        req.session.user_id = data[0].user_id;
        req.session.user_name = data[0].first_name + " " + data[0].last_name;
        req.session.user_email = data[0].email;
        req.session.user_phone = data[0].phone;
        res.redirect(d.redirect || "/");
    } else {
        res.send("Invalid email or password <a href='/login'>Try Again</a>");
    }
});

// ================== Cart ==================
function checkLogin(req, res, next) {
    if (req.session.user_id) next();
    else res.redirect("/login?redirect=" + encodeURIComponent(req.originalUrl));
}

router.get("/add_to_cart/:product_id/:variant_id/:color/:qty", checkLogin, async (req, res) => {
    let { product_id, variant_id, color, qty } = req.params;
    let user_id = req.session.user_id;

    let check = await exe(
        "SELECT * FROM cart WHERE user_id=? AND product_id=? AND variant_id=? AND color=?",
        [user_id, product_id, variant_id, color]
    );

    if (check.length > 0) {
        await exe("UPDATE cart SET quantity = quantity + ? WHERE cart_id=?", [qty, check[0].cart_id]);
    } else {
        await exe(
            "INSERT INTO cart (user_id, product_id, variant_id, color, quantity, created_at) VALUES (?,?,?,?,?,NOW())",
            [user_id, product_id, variant_id, color, qty]
        );
    }

    res.redirect(`/product_details/${product_id}?variant_id=${variant_id}&color=${color}`);
});

router.get("/update_cart/:product_id/:variant_id/:color/:qty", checkLogin, async (req, res) => {
    let { product_id, variant_id, color, qty } = req.params;
    let user_id = req.session.user_id;

    await exe(
        "UPDATE cart SET quantity=? WHERE user_id=? AND product_id=? AND variant_id=? AND color=?",
        [qty, user_id, product_id, variant_id, color]
    );

    res.redirect(`/product_details/${product_id}?variant_id=${variant_id}&color=${color}`);
});







router.get("/cart", checkLogin, async (req, res) => {
    const user_id = req.session.user_id;

    const sql = `
    SELECT c.*, p.product_name, p.product_colors, p.product_main_image, pv.variation_price
    FROM cart c
    JOIN products p ON c.product_id = p.product_id
    JOIN product_variants pv ON c.variant_id = pv.product_variant_id
    WHERE c.user_id = ?
  `;

    const carts = await exe(sql, [user_id]);
    res.render("user/cart", { carts });
});
// Remove item from cart
router.get("/remove_from_cart/:id", checkLogin, async (req, res) => {
    const cart_id = req.params.id;

    const sql = "DELETE FROM cart WHERE cart_id = ?";
    await exe(sql, [cart_id]);

    res.redirect("/cart");
});



// Increment
router.post("/increment_quantity/:cart_id", checkLogin, async (req, res) => {
    const cart_id = req.params.cart_id;
    const user_id = req.session.user_id;

    await exe(`UPDATE cart SET quantity = quantity + 1 WHERE cart_id=? AND user_id=?`, [cart_id, user_id]);
    const updatedCart = await exe(`SELECT quantity FROM cart WHERE cart_id=? AND user_id=?`, [cart_id, user_id]);

    res.json({ quantity: updatedCart[0].quantity });
});

// Decrement
router.post("/decrement_quantity/:cart_id", checkLogin, async (req, res) => {
    const cart_id = req.params.cart_id;
    const user_id = req.session.user_id;

    await exe(`UPDATE cart SET quantity = GREATEST(quantity - 1, 1) WHERE cart_id=? AND user_id=?`, [cart_id, user_id]);
    const updatedCart = await exe(`SELECT quantity FROM cart WHERE cart_id=? AND user_id=?`, [cart_id, user_id]);

    res.json({ quantity: updatedCart[0].quantity });
});




function checkLogin(req, res, next) {
    if (req.session.user_id) {
        next();
    } else {
        res.redirect("/login");
    }
}

router.get("/checkout", checkLogin, async function (req, res) {
    const user_id = req.session.user_id;

    // Fetch user details
    const userResult = await exe("SELECT * FROM users WHERE user_id = ?", [user_id]);
    if (!userResult.length) return res.redirect('/login'); // user not found
    const user = userResult[0];

    // Fetch cart items
    const sql = `
        SELECT c.*, p.product_name, p.product_colors, p.product_main_image, 
               pv.variation_price AS unit_price, pv.variation_title
        FROM cart c
        JOIN products p ON c.product_id = p.product_id
        JOIN product_variants pv ON c.variant_id = pv.product_variant_id
        WHERE c.user_id = ?
    `;
    const cart_data = await exe(sql, [user_id]);

    // Pass both user and cart_data to EJS
    res.render('user/checkout.ejs', { user: user, cart: cart_data });
});



router.post("/place-order", checkLogin, async function (req, res) {
    // ---- Calculate Total Amount ----
    var totalSql = `
    SELECT SUM(pv.variation_price * c.quantity) AS total_amount
    FROM cart c
    JOIN product_variants pv ON c.variant_id = pv.product_variant_id
    WHERE c.user_id = ?
  `;
    var totalResult = await exe(totalSql, [req.session.user_id]);
    var total_amount = totalResult[0].total_amount || 0;

    // ---- Insert into Orders Table ----
    var insertOrderSql = `
    INSERT INTO orders 
    (user_id, first_name, last_name, email, phone, address, city, state, zip_code, payment, transaction_id, notes, total_amount, order_date, dispatch_date, deliver_date, cancel_date, order_status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    var orderResult = await exe(insertOrderSql, [
        req.session.user_id,
        req.body.first_name,
        req.body.last_name,
        req.body.email,
        req.body.phone,
        req.body.address,
        req.body.city,
        req.body.state,
        req.body.zip_code,
        req.body.payment,
        req.body.transaction_id || null,
        req.body.notes || null,
        total_amount,
        new Date(),   // order_date
        null,         // dispatch_date
        null,         // deliver_date
        null,         // cancel_date
        "Pending"
    ]);

    var order_id = orderResult.insertId;

    // ---- Get Cart Data ----
    var cartSql = `
    SELECT c.quantity, c.product_id, pv.product_variant_id, pv.variation_price, pv.variation_market_price AS market_price, p.product_name
    FROM cart c
    JOIN products p ON c.product_id = p.product_id
    JOIN product_variants pv ON c.variant_id = pv.product_variant_id
    WHERE c.user_id = ?
  `;
    var cartData = await exe(cartSql, [req.session.user_id]);

    // ---- Insert into order_products ----
    for (let item of cartData) {
        var insertItemSql = `
      INSERT INTO order_products 
      (order_id, user_id, product_id, variant_id, product_name, product_color, market_price, quantity, price, total_price) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        await exe(insertItemSql, [
            order_id,
            req.session.user_id,
            item.product_id,
            item.product_variant_id,
            item.product_name,
            null,                 // product_color नाही आहे
            item.market_price || 0, // variation_market_price
            item.quantity,
            item.variation_price,
            item.quantity * item.variation_price
        ]);
    }

    // ---- Clear Cart After Order ----
    var clearCartSql = `DELETE FROM cart WHERE user_id = ?`;
    await exe(clearCartSql, [req.session.user_id]);



    if (req.body.payment === 'online') {

        res.redirect('/pay-now/' + order_id);
    } else {

        res.send(" Order placed successfully!");
    }


});


// 
// My Orders Route

// ================== My Orders ==================


router.get("/orders", checkLogin, async (req, res) => {
    const user_id = req.session.user_id;

    const sqlOrders = "SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC";
    const orders = await exe(sqlOrders, [user_id]);

    for (let i = 0; i < orders.length; i++) {
        const sqlProducts = `
      SELECT op.*, p.product_name, p.product_main_image, pv.variation_title
      FROM order_products op
      JOIN products p ON op.product_id = p.product_id
      LEFT JOIN product_variants pv ON op.variant_id = pv.product_variant_id
      WHERE op.order_id = ?
    `;
        const orderProducts = await exe(sqlProducts, [orders[i].order_id]);
        orders[i].order_products = orderProducts;
    }

    res.render("user/orders.ejs", { orders });  // 
});




router.get("/profile-orders", checkLogin, async (req, res) => {
    const user_id = req.session.user_id;

    const sqlOrders = "SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC";
    const orders = await exe(sqlOrders, [user_id]);

    for (let i = 0; i < orders.length; i++) {
        const sqlProducts = `
      SELECT op.*, p.product_name, p.product_main_image, pv.variation_title
      FROM order_products op
      JOIN products p ON op.product_id = p.product_id
      LEFT JOIN product_variants pv ON op.variant_id = pv.product_variant_id
      WHERE op.order_id = ?
    `;
        const orderProducts = await exe(sqlProducts, [orders[i].order_id]);
        orders[i].order_products = orderProducts;
    }

    res.render("user/orders.ejs", { orders });
});








// Order Success
router.get("/order_success/:order_id", checkLogin, async (req, res) => {
    const order_id = req.params.order_id;

    const sqlOrder = "SELECT * FROM orders WHERE order_id = ?";
    const order = await exe(sqlOrder, [order_id]);

    const sqlProducts = `
    SELECT op.*, p.product_name, p.product_main_image, pv.variation_title
    FROM order_products op
    JOIN products p ON op.product_id = p.product_id
    LEFT JOIN product_variants pv ON op.variant_id = pv.product_variant_id
    WHERE op.order_id = ?
  `;
    const orderProducts = await exe(sqlProducts, [order_id]);

    res.render("user/order_success", { order: order[0], orderProducts });
});






// pay-now page route
// create-order route
router.post("/create-order", async (req, res) => {
    const { amount } = req.body; // frontend कडून amount येईल

    // Razorpay instance
    var instance = new Razorpay({
        key_id: "rzp_test_GmXyAFAK01Uo7t",
        key_secret: "YOUR_SECRET_KEY", // Dashboard मधून घ्या
    });

    // order तयार करा
    let order = await instance.orders.create({
        amount: amount * 100, // रुपयात असेल तर 100 ने multiply करा
        currency: "INR",
        receipt: "receipt_" + new Date().getTime(),
    });

    res.json(order);
});











// pay-now route
router.get("/pay-now/:id", checkLogin, async (req, res) => {
    var order_id = req.params.id;

    // Order DB मधून fetch करा
    var sql = `SELECT * FROM orders WHERE order_id = ? AND user_id = ?`;
    var order = await exe(sql, [order_id, req.session.user_id]);

    if (order.length > 0) {
        res.render("user/pay-now.ejs", { order });
    } else {
        res.send(" Order not found");
    }
});






// ================== Wishlist ==================


function checkLogin(req, res, next) {
    if (req.session.user_id) next();
    else res.redirect("/login?redirect=" + encodeURIComponent(req.originalUrl));
}

// Add to wishlist
router.get("/add_to_wishlist/:product_id/:variant_id", checkLogin, async (req, res) => {
    const { product_id, variant_id } = req.params;
    const user_id = req.session.user_id;

    const exists = await exe("SELECT * FROM wishlist WHERE user_id=? AND product_id=? AND variant_id=?", [user_id, product_id, variant_id]);

    if (exists.length === 0) {
        await exe("INSERT INTO wishlist (user_id, product_id, variant_id, created_at) VALUES (?, ?, ?, NOW())", [user_id, product_id, variant_id]);
    }

    res.redirect("/wishlist");
});

// Remove from wishlist
router.get("/remove_from_wishlist/:id", checkLogin, async (req, res) => {
    const wishlist_id = req.params.id;
    await exe("DELETE FROM wishlist WHERE wishlist_id=?", [wishlist_id]);
    res.redirect("/wishlist");
});

// Wishlist page
router.get("/wishlist", checkLogin, async (req, res) => {
    const user_id = req.session.user_id;

    // Wishlist fetch with product + variant details
    const wishlist = await exe(`
        SELECT 
            w.wishlist_id,
            p.product_id,
            p.product_name,
            p.product_main_image,
            pv.product_variant_id,Q
            pv.variation_title,
            pv.variation_market_price,
            pv.variation_price,
            pv.image AS variant_image
        FROM wishlist w
        JOIN products p ON w.product_id = p.product_id
        LEFT JOIN product_variants pv ON w.variant_id = pv.product_variant_id
        WHERE w.user_id = ?
    `, [user_id]);

    // For items without variant, pick the lowest price variant as default
    for (let item of wishlist) {
        if (!item.variation_market_price) {
            const defaultVariant = await exe(`
                SELECT variation_market_price, variation_price, image 
                FROM product_variants 
                WHERE product_id = ? ORDER BY variation_market_price ASC LIMIT 1
            `, [item.product_id]);

            if (defaultVariant.length > 0) {
                item.variation_market_price = defaultVariant[0].variation_market_price;
                item.variation_price = defaultVariant[0].variation_price;
                item.variant_image = defaultVariant[0].image;
            } else {
                item.variation_market_price = 0;
                item.variation_price = 0;
                item.variant_image = item.product_main_image;
            }
        }
    }

    // Recently viewed / suggestions
    const recentlyViewed = await exe(`
        SELECT p.product_id, p.product_name, p.product_main_image, 
               pv.variation_market_price, pv.variation_price, pv.image AS variant_image
        FROM products p
        LEFT JOIN product_variants pv ON p.product_id = pv.product_id
        GROUP BY p.product_id
        ORDER BY p.created_at DESC LIMIT 4
    `);

    res.render("user/wishlist_list", { wishlist, recentlyViewed });
});





// profile
router.get("/pro", checkLogin, async (req, res) => {
    try {
        const user_id = req.session.user_id;

        const userResult = await exe("SELECT * FROM users WHERE user_id = ?", [user_id]);
        if (!userResult || userResult.length === 0) return res.redirect("/login");

        const user = userResult[0];

        const orders = await exe("SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC LIMIT 5", [user_id]);

        const orderProducts = await exe(`
            SELECT op.*, p.product_name, pv.variation_title
            FROM order_products op
            LEFT JOIN products p ON op.product_id = p.product_id
            LEFT JOIN product_variants pv ON op.variant_id = pv.product_variant_id
            WHERE op.user_id = ?
            ORDER BY op.created_at DESC
        `, [user_id]);

        res.render("user/pro", { user, orders, orderProducts });

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});



router.get("/profile-edit", async (req, res) => {
    const user_id = req.session.user_id;
    if (!user_id) return res.redirect("/login");
    const result = await exe("SELECT * FROM users WHERE user_id = ?", [user_id]);

    if (!result || result.length === 0) return res.redirect("/login");
    const user = result[0];

    res.render("user/profile_edit", { user });
});




// Middleware to check login
function checkLogin(req, res, next) {
    if (req.session.user_id) next();
    else res.redirect("/login");
}

// 1️Show all orders

// All invoices page (all orders list)
// My Orders Page
router.get("/profile-invoice", checkLogin, async (req, res) => {
    const user_id = req.session.user_id;

    // User data
    const userResult = await exe("SELECT * FROM users WHERE user_id = ?", [user_id]);
    if (!userResult.length) return res.redirect("/login");
    const user = userResult[0];

    // All orders
    const orders = await exe("SELECT * FROM orders WHERE user_id = ?", [user_id]);

    res.render("user/orders", { user, orders });
});


// Single Invoice Page
router.get("/profile-invoice/:orderId", checkLogin, async (req, res) => {
    const user_id = req.session.user_id;
    const order_id = req.params.orderId;

    // User info
    const userResult = await exe("SELECT * FROM users WHERE user_id = ?", [user_id]);
    if (!userResult.length) return res.redirect("/login");
    const user = userResult[0];

    // Order info
    const orderResult = await exe("SELECT * FROM orders WHERE order_id = ? AND user_id = ?", [order_id, user_id]);
    if (!orderResult.length) return res.send("Order not found");
    const order = orderResult[0];

    // Order products
    const orderProducts = await exe(`
        SELECT op.*, p.product_name, p.product_main_image AS product_image, 
               pv.variation_title, op.price AS unit_price
        FROM order_products op
        LEFT JOIN products p ON op.product_id = p.product_id
        LEFT JOIN product_variants pv ON op.variant_id = pv.product_variant_id
        WHERE op.order_id = ?
    `, [order_id]);

    // Convert & Calculate totals
    orderProducts.forEach(op => {
        op.unit_price = Number(op.unit_price) || 0;
        op.quantity = Number(op.quantity) || 0;
    });

    order.subtotal = orderProducts.reduce((sum, op) => sum + (op.unit_price * op.quantity), 0);
    order.shipping_cost = Number(order.shipping_cost) || 50;
    order.tax = Number(order.tax) || Math.round(order.subtotal * 0.18);
    order.total = order.subtotal + order.shipping_cost + order.tax;

    res.render("user/invoice", { user, order, orderProducts });
});



// Alias route for all orders (optional)
// Middleware to check login
function isLoggedIn(req, res, next) {
    if (req.session && req.session.user_id) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Profile Addresses page
router.get('/profile-addresses', isLoggedIn, async (req, res) => {
    const userId = req.session.user_id;

    // Fetch user info
    const userResult = await exe("SELECT * FROM users WHERE user_id = ?", [userId]);
    if (!userResult || userResult.length === 0) return res.redirect('/login');
    const user = userResult[0];

    // Fetch addresses
    const addresses = await exe("SELECT * FROM addresses WHERE user_id = ?", [userId]);

    // Render template
    res.render('user/profile_address', { addresses, user });
});

router.post('/add-address', (req, res) => {
    const { street, city, state, zip } = req.body;

    const userId = req.session.user_id; // assume session मध्ये user id आहे
    if (!userId) return res.redirect('/login');

    const query = `INSERT INTO addresses (user_id, street, city, state, zip) VALUES (?, ?, ?, ?, ?)`;
    exe.query(query, [userId, street, city, state, zip], (err, result) => {
        if (err) {
            console.log(err);
            return res.send('Error saving address');
        }
        res.redirect('/pro/addresses'); // address page वर redirect करा
    });
});


router.post("/save-address", (req, res) => {
    console.log("Form data:", req.body);

    // Assuming user is logged in and session contains user_id
    const userId = req.session.userId || 1; // replace with real session

    const {
        cartType,
        fullName,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        phone,
        setAsDefault
    } = req.body;

    const address = addressLine1 + (addressLine2 ? " " + addressLine2 : "");

    const sql = `INSERT INTO addresses
        (user_id, cart_type, first_name, last_name, address, city, state, zip_code, country, phone, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    exe(sql, [
        userId,
        cartType,
        fullName,       // first_name
        "",             // last_name blank
        address,
        city,
        state,
        zipCode,
        "India",
        phone,
        setAsDefault ? 1 : 0
    ])
        .then(() => res.send("Address saved successfully!"))
        .catch(err => {
            console.log("MYSQL ERROR:", err);
            res.send("Error saving address");
        });
});

router.get('/terms', (req, res) => {
    res.render('user/terms');
});

router.get('/privacy', (req, res) => {
    res.render('user/privacy');
});


router.get("/payment/:orderId", async (req, res) => {
    const orderId = req.params.orderId;
    const [order] = await exe("SELECT * FROM orders WHERE order_id = ?", [orderId]);
    const orderProducts = await exe("SELECT * FROM order_products WHERE order_id = ?", [orderId]);

    res.render("user/payment", { order, orderProducts });
});




// GET Contact Page
router.get('/contact', (req, res) => {
    res.render('user/contact'); // contact.ejs user folder मध्ये असल्यास
});

router.get('/about', (req, res) => {
    res.render('user/about');
});





router.get('/refund', (req, res) => {
    res.render('user/refund');
});



router.get("/profile-password", (req, res) => {
    res.render("user/profile_password", { user: req.session.user || null });
});


// ===== 1️ Show email form =====
router.get("/forgot-password-email", (req, res) => {
    res.render("user/forgot_password_email", { error: null });
});

// ===== 2️ Handle email submit & send OTP =====
router.post("/forgot-password-email", async (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.render("user/forgot_password_email", { error: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await exe("INSERT INTO password_otps (email, otp, created_at) VALUES (?, ?, NOW())", [email, otp]);
    await sendOtpEmail(email, otp);

    res.redirect("/forgot-password-otp?email=" + encodeURIComponent(email));
});

// ===== 3️ Show OTP form =====
router.get("/forgot-password-otp", (req, res) => {
    const email = req.query.email;
    if (!email) return res.redirect("/forgot-password-email");
    res.render("user/forgot_password_otp", { email, error: null });
});

// ===== 4️ Verify OTP =====
router.post("/forgot-password/verify-otp", async (req, res) => {
    const { email } = req.body;
    const otp = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4 + req.body.otp5 + req.body.otp6;

    const result = await exe(
        "SELECT * FROM password_otps WHERE email=? AND otp=? ORDER BY created_at DESC LIMIT 1",
        [email, otp]
    );

    if (result.length > 0) {
        res.redirect("/forgot-password-reset?email=" + encodeURIComponent(email));
    } else {
        res.render("user/forgot_password_otp", { email, error: "Invalid OTP" });
    }
});

// ===== 5️ Show reset password form =====
router.get("/forgot-password-reset", (req, res) => {
    const email = req.query.email;
    if (!email) return res.redirect("/forgot-password-email");
    res.render("user/forgot_password_reset", { email, error: null });
});

// ===== 6️ Save new password =====
router.post("/forgot-password/reset-password", async (req, res) => {
    const { email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        return res.render("user/forgot_password_reset", { email, error: "Passwords do not match" });
    }

    await exe("UPDATE users SET password=? WHERE email=?", [password, email]);
    res.send("Password reset successfully! <a href='/login'>Login Now</a>");
});






// Blog Page Route
router.get("/blog", (req, res) => {
    res.render("user/blog");  // views/blog.ejs
});



// Product Details Route
router.get("/product_details/:product_id", async (req, res) => {
    const productId = req.params.product_id;
    const variantId = req.query.variant_id;
    const color = req.query.color;

    // DB fetch example (replace with actual DB code)
    const product = await db.getProductById(productId); // array with 1 product
    const product_variants = await db.getVariantsByProductId(productId);
    const selected_variant = variantId ? product_variants.find(v => v.product_variant_id == variantId) : product_variants[0];
    const images = await db.getProductImages(productId);

    // User cart info (if logged in)
    const cart = req.user ? await db.getCart(req.user.id, productId) : [];

    res.render("user/product_details", {
        product,
        product_variants,
        selected_variant,
        images,
        color,
        cart,
        user: req.user || null
    });
});


// Portfolio page\

// Get all projects
router.get("/portfolio", async (req, res) => {
    const projects = await exe("SELECT * FROM portfolio"); // DB मधून main_image मिळेल
    res.render("user/portfolio", { projects });
});












module.exports = router;

