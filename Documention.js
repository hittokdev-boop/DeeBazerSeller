// ## 1. Seller Registration
// Creates a new seller account and profile.

// **Endpoint:** `POST /api/seller/register`

// **Request Format:** `multipart/form-data`

// **Request Body Fields:**
// - `name` (string, required): Full name of the seller
// - `email` (string, required): Unique email address
// - `mobile` (string, required): Unique mobile number
// - `password` (string, required): Password (min 6 characters)
// - `password_confirmation` (string, required): Must match password
// - `store_name` (string, required): Name of the store
// - `store_description` (string, optional): Short description of the store
// - `logo` (file, optional): Logo image file
// - `business_type` (string, required): individual, company, or partnership
// - `gst_number` (string, optional): GST number
// - `pan_number` (string, optional): PAN number
// - `address` (string, required): Full street address
// - `city` (string, required): City name
// - `state` (string, required): State name
// - `postal_code` (string, required): ZIP/PIN code
// - `bank_account_number` (string, required): Bank account number
// - `bank_ifsc_code` (string, required): IFSC code
// - `bank_account_holder_name` (string, required): Account holder name
// - `bank_name` (string, required): Bank name

// **Response (201):**
// ```json
// {
//   "status": 201,
//   "message": "Registration successful! Your seller account is under review.",
//   "data": {
//     "user": {
//       "id": 42,
//       "name": "Rajan Sharma",
//       "email": "rajan@example.com",
//       "mobile": "9876543210",
//       "role": "seller",
//       "status": "active",
//       "approval_status": "pending"
//     },
//     "seller": {
//       "id": 15,
//       "store_name": "Rajan's Electronics",
//       "status": "pending"
//     }
//   }
// }
// ```

// **Response (422 - Validation Error):**
// ```json
// {
//   "status": 422,
//   "message": "Validation failed",
//   "errors": {
//     "email": ["The email has already been taken."],
//     "mobile": ["The mobile has already been taken."]
//   }
// }
// ```

// ---

// ## 2. Seller Login
// Login with email and password.

// **Endpoint:** `POST /api/seller/login`

// **Request Body:**
// ```json
// {
// email:test@example.com
// password:yourpassword
// fcm_token:test_token_web_456
// device_type:web3"
// }
// ```

// **Response (200):**
// ```json
// {
//   "status": 200,
//   "message": "Login successful",
//   "user": {
//     "id": 42,
//     "name": "Rajan Sharma",
//     "email": "rajan@example.com",
//     "mobile": "9876543210",
//     "role": "seller",
//     "status": "active"
//   },
//   "token": "1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
//   "redirect_to": "/"
// }
// ```

// ## 3. Get Current Seller (Me)

// ### `GET /api/seller/me`

// Returns the authenticated user + seller profile. Useful on app launch to restore session.

// **Headers:** `Authorization: Bearer {token}`

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "user": {
//       "id": 42,
//       "name": "Rajan Sharma",
//       "email": "rajan@example.com",
//       "mobile": "9876543210",
//       "role": "seller",
//       "status": "active",
//       "approval_status": "pending",
//       "logo_url": "https://...",
//       "last_login_at": "2026-08-06T09:30:00.000000Z"
//     },
//     "seller": {
//       "id": 15,
//       "store_name": "Rajan's Electronics",
//       "store_slug": "rajans-electronics-42",
//       "status": "approved",
//       "wallet_balance": 1250.50,
//       "total_earnings": 45000.00,
//       "rating": 4.5,
//       "total_ratings": 128
//     }
//   }
// }
// ```

// ---

// ## 4. Logout

// ### `POST /api/seller/logout`

// Revokes the current Bearer token.

// **Headers:** `Authorization: Bearer {token}`

// **Response** — `200`

// ```json
// {
//   "status": 200product 

//   "message": "Logged out successfully."
// }
// ```

// ---

// ## 5. Update Account

// ### `PUT /api/seller/account`

// Updates the seller's login credentials (name, email, mobile, password). All fields are optional — only send what you want to change. To change password, `current_password` must also be provided.

// **Headers:** `Authorization: Bearer {token}`
// **Body:** `application/json`

// | Field | Type | Required | Notes |
// |---|---|---|---|
// | `name` | string | :x: | |
// | `email` | string | :x: | Must be unique |
// | `mobile` | string | :x: | Must be unique |
// | `current_password` | string | Required if changing password | |
// | `password` | string | :x: | Min 6 chars |
// | `password_confirmation` | string | Required if `password` sent | |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Account updated successfully.",
//   "data": {
//     "user": { "id": 42, "name": "Rajan Kumar", "email": "rajan@example.com", "..." }
//   }
// }
// ```

// ---

// ## 6. Store Profile

// ### `GET /api/seller/profile`

// Returns full store profile including policies, shipping settings and financial summary.

// **Headers:** `Authorization: Bearer {token}`

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "id": 15,
//     "store_name": "Rajan's Electronics",
//     "store_slug": "rajans-electronics-42",
//     "description": "Best electronics in town",
//     "logo_url": "https://...",
//     "banner_url": "https://...",
//     "business_type": "individual",
//     "tax_number": "22AAAAA0000A1Z5",
//     "phone": "9876543210",
//     "email": "rajan@example.com",
//     "address": "123 MG Road",
//     "city": "Bengaluru",
//     "state": "Karnataka",
//     "postal_code": "560001",
//     "country": "India",
//     "latitude": "12.9716000",
//     "longitude": "77.5946000",
//     "delivery_radius_km": 15,
//     "is_location_enabled": true,
//     "status": "approved",
//     "is_verified": true,
//     "is_featured": false,
//     "commission_rate": 10.0,
//     "wallet_balance": 1250.50,
//     "pending_balance": 320.00,
//     "total_earnings": 45000.00,
//     "total_orders": 230,
//     "rating": 4.5,
//     "total_ratings": 128,
//     "store_policies": {
//       "return_policy": "7-day returns accepted",
//       "shipping_policy": "Ships within 2 business days",
//       "privacy_policy": null
//     },
//     "shipping_settings": {
//       "free_shipping_above": 499,
//       "standard_rate": 49,
//       "express_rate": 99,
//       "processing_days": 1,
//       "ships_from": "Bengaluru"
//     },
//     "approved_at": "2026-07-01T12:00:00.000000Z",
//     "created_at": "2026-06-15T08:00:00.000000Z"
//   }
// }
// ```

// ### `PUT /api/seller/profile`

// Update store details. **Requires approved status.**
// Send as `multipart/form-data` if uploading logo/banner, otherwise `application/json`.

// | Field | Type | Notes |
// |---|---|---|
// | `store_name` | string | Regenerates `store_slug` automatically |
// | `store_description` / `description` | string | Either key accepted |
// | `phone` | string | |
// | `address`, `city`, `state`, `postal_code`, `country` | string | |
// | `latitude`, `longitude` | numeric | Enables location-based features |
// | `delivery_radius_km` | integer | 1–500 |
// | `logo` | file | jpeg/png/jpg/webp, max 2MB |
// | `banner` | file | jpeg/png/jpg/webp, max 4MB |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Store profile updated successfully.",
//   "data": { "...updated profile object..."
// }
// ```

// ---

// ## 7. Bank Details

// ### `GET /api/seller/bank-details`

// Returns saved bank details. The account number is **masked** (last 4 digits visible).

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "account_number": "**********3456",
//     "ifsc_code": "SBIN0001234",
//     "account_holder_name": "Rajan Sharma",
//     "bank_name": "State Bank of India",
//     "branch_name": "MG Road Branch",
//     "upi_id": "rajan@upi"
//   }
// }
// ```

// ### `PUT /api/seller/bank-details`

// | Field | Type | Required |
// |---|---|---|
// | `account_number` | string | :white_check_mark: |
// | `ifsc_code` | string | :white_check_mark: |
// | `account_holder_name` | string | :white_check_mark: |
// | `bank_name` | string | :white_check_mark: |
// | `branch_name` | string | :x: |
// | `upi_id` | string | :x: |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Bank details updated successfully."
// }
// ```

// ## 8. Store Policies

// ### `PUT /api/seller/store-policies`

// | Field | Type | Max |
// |---|---|---|
// | `return_policy` | string | 2000 |
// | `shipping_policy` | string | 2000 |
// | `privacy_policy` | string | 2000 |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Store policies updated successfully."
// }
// ```

// ---

// ## 9. Shipping Settings

// ### `PUT /api/seller/shipping-settings`

// | Field | Type | Description |
// |---|---|---|
// | `free_shipping_above` | numeric | Order amount above which shipping is free (e.g. 499) |
// | `standard_rate` | numeric | Standard shipping charge |
// | `express_rate` | numeric | Express shipping charge |
// | `processing_days` | integer | Days to process before dispatch (0–30) |
// | `ships_from` | string | City/location label shown to buyers |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Shipping settings updated successfully."
// }
// ```

// ---

// ## 10. Wallet & Earnings

// ### `GET /api/seller/wallet`

// Quick summary of financial balances.

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "wallet_balance": 1250.50,
//     "pending_balance": 320.00,
//     "total_earnings": 45000.00,
//     "commission_rate": 10.0
//   }
// }
// ```

// > `wallet_balance` = available for withdrawal
// > `pending_balance` = earnings from orders not yet settled
// > `total_earnings` = lifetime earnings after commission

// ---

// ## 11. Dashboard

// ### `GET /api/seller/dashboard`

// Consolidated stats, recent orders, and recent products for the home screen.

// **Headers:** `Authorization: Bearer {token}` (approved sellers only)

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "stats": {
//       "total_products": 45,
//       "approved_products": 38,
//       "pending_products": 5,
//       "rejected_products": 2,
//       "total_orders": 230,
//       "pending_orders": 12,
//       "processing_orders": 8,
//       "shipped_orders": 5,
//       "delivered_orders": 200,
//       "cancelled_orders": 5,
//       "total_earnings": 45000.00,
//       "wallet_balance": 1250.50,
//       "pending_balance": 320.00
//     },
//     "recent_orders": [
//       {
//         "id": 101,
//         "order_number": "ORD-2026-00101",
//         "status": "pending",
//         "subtotal": 1299.00,
//         "seller_amount": 1169.10,
//         "customer": { "id": 7, "name": "Priya Patel", "mobile": "9123456789" },
//         "created_at": "2026-08-06T09:00:00.000000Z"
//       }
//     ],
//     "recent_products": [
//       {
//         "id": 20,
//         "product_id": 55,
//         "name": "Wireless Earbuds Pro",
//         "image_url": "https://...",
//         "price": 1299.00,
//         "stock_quantity": 50,
//         "status": "approved"
//       }
//     ]
//   }
// }
// ```

// ---

// ## 12. Products — List

// ### `GET /api/seller/products`

// Returns paginated list of the seller's products.

// **Query Parameters**

// | Param | Type | Default | Options |
// |---|---|---|---|
// | `status` | string | `all` | `pending`, `approved`, `rejected`, `all` |
// | `search` | string | — | Searches product name and SKU |
// | `category` | integer | — | Filter by `category_id` |
// | `per_page` | integer | `15` | Max 50 |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "products": [
//       {
//         "id": 20,
//         "product_id": 55,
//         "name": "Wireless Earbuds Pro",
//         "slug": "wireless-earbuds-pro",
//         "sku": "SKU-AB12CD34",
//         "image_url": "https://...",
//         "category": { "id": 3, "name": "Electronics" },
//         "price": 1299.00,
//         "sale_price": 999.00,
//         "effective_price": 999.00,
//         "is_on_sale": true,
//         "discount_pct": 23.09,
//         "stock_quantity": 50,
//         "min_stock_alert": 5,
//         "is_low_stock": false,
//         "status": "approved",
//         "approval_status": "approved",
//         "rejection_reason": null,
//         "is_featured": false,
//         "is_trending": true,
//         "views_count": 340,
//         "sales_count": 85,
//         "rating_average": 4.4,
//         "rating_count": 62,
//         "created_at": "2026-07-10T11:00:00.000000Z"
//       }
//     ],
//     "pagination": {
//       "total": 45,
//       "per_page": 15,
//       "current_page": 1,
//       "last_page": 3,
//       "from": 1,
//       "to": 15
//     },
//     "counts": {
//       "total": 45,
//       "approved": 38,
//       "pending": 5,
//       "rejected": 2
//     }
//   }
// }
// ```

// ---

// ## 13. Products — Show

// ### `GET /api/seller/products/{id}`

// Returns detailed view of a single seller product including full description, gallery, and attributes.

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "id": 20,
//     "product_id": 55,
//     "name": "Wireless Earbuds Pro",
//     "slug": "wireless-earbuds-pro",
//     "sku": "SKU-AB12CD34",
//     "image_url": "https://...",
//     "short_description": "Premium wireless earbuds with ANC",
//     "description": "<p>Full product description...</p>",
//     "weight": 0.15,
//     "tags": ["electronics", "earbuds", "wireless"],
//     "gallery": ["https://img1.jpg", "https://img2.jpg"],
//     "category": { "id": 3, "name": "Electronics" },
//     "price": 1299.00,
//     "sale_price": 999.00,
//     "stock_quantity": 50,
//     "status": "approved",
//     "approval_status": "approved",
//     "created_at": "2026-07-10T11:00:00.000000Z"
//   }
// }
// ```

// ---

// ## 14. Products — Create

// ### `POST /api/seller/products`

// Submits a new product for admin review. Newly created products have `status: pending` and are **not visible** to buyers until approved.

// **Content-Type:** `multipart/form-data`

// | Field | Type | Required | Notes |
// |---|---|---|---|
// | `name` | string | :white_check_mark: | |
// | `price` | numeric | :white_check_mark: | Base price |
// | `sale_price` | numeric | :x: | Must be less than `price` |
// | `stock_quantity` | integer | :white_check_mark: | |
// | `category_id` | integer | :white_check_mark: | Must exist in categories table |
// | `short_description` | string | :x: | Max 500 chars |
// | `description` | string | :x: | Full HTML/text description |
// | `sub_category_id` | integer | :x: | |
// | `child_category_id` | integer | :x: | |
// | `brand_id` | integer | :x: | |
// | `sku` | string | :x: | Auto-generated if not provided |
// | `weight` | numeric | :x: | In kg |
// | `tags` | array | :x: | e.g. `tags[]=wireless&tags[]=earbuds` |
// | `min_stock_alert` | integer | :x: | Default 5 — triggers low stock flag |
// | `image` | file | :x: | Main product image (max 4MB) |
// | `gallery[]` | file | :x: | Additional images (multiple files) |

// **Response** — `201`

// ```json
// {
//   "status": 201,
//   "message": "Product submitted for review. It will be visible once approved by admin.",
//   "data": { "id": 21, "name": "New Headphones", "status": "pending", "..." }
// }
// ```

// ---

// User Profile Update :
//15 POST : {{base_url}}api/user/profile
// authorization : bearer_token {seller_token}

// body :
// name: User_A59bgo
// //email: rajesh.kumar@example.com
// mobile: 8240804149
// //state: Odisha
// //city: Cuttack
// //zipCode: 753001
// //address: 123 Main Road, Buxi Bazar
// //landmark: Near City Hospital
// //alternativePhone: 9861234567ma
// logo : file

// response:
// {
//     "status": 200,
//     "message": "Profile updated successfully",
//     "user": {
//         "id": "82",
//         "name": "User_A59bgo",
//         "email": null,
//         "mobile": "8240804149",
//         "role": "user",
//         "status": "active",
//         "approval_status": "approved",
//         "avatar": "https://deebazar.com/admin/images/uploads/logo/1789544914_6aaa49d299eb4.png",
//         "store_name": null,
//         "store_description": null,
//         "state": null,
//         "city": null,
//         "zipCode": null,
//         "address": null,
//         "landmark": null,
//         "alternativePhone": null,
//         "joinedDate": "2026-08-21T13:23:00+05:30",
//         "lastLoginAt": "2026-09-14T21:15:15+05:30"
//     }
// }

// ## 16. Products — Delete

// ### `DELETE /api/seller/products/{id}`

// Deletes the seller product. **Blocked** if the product has existing orders or wishlist entries.

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Product deleted successfully."
// }
// ```

// **Blocked Response** — `409`

// ```json
// {
//   "status": 409,
//   "message": "Cannot delete this product as it has associated orders or wishlist items.",
//   "details": {
//     "Order Items": 5,
//     "Wishlist Items": 12
//   }
// }
// ```

// ---

// ## 17. Products — Update Stock

// ### `PATCH /api/seller/products/{id}/stock`

// Quick stock-only update. Does not trigger re-review.

// **Body** — `application/json`

// ```json
// { "stock_quantity": 75 }
// ```

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Stock updated successfully.",
//   "data": { "stock_quantity": 75, "in_stock": true }
// }
// ```

// ---

// ## 18. Orders — List

// ### `GET /api/seller/orders`

// Returns paginated orders for the authenticated seller.

// **Query Parameters**

// | Param | Type | Default | Options |
// |---|---|---|---|
// | `status` | string | `all` | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`, `all` |
// | `search` | string | — | Search by order number |
// | `date_from` | date | — | `Y-m-d` format |
// | `date_to` | date | — | `Y-m-d` format |
// | `per_page` | integer | `15` | Max 50 |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "orders": [
//       {
//         "id": 101,
//         "order_number": "ORD-2026-00101",
//         "status": "pending",
//         "subtotal": 1299.00,
//         "commission_amount": 129.90,
//         "seller_amount": 1169.10,
//         "shipping_cost": 49.00,
//         "tracking_number": null,
//         "shipping_carrier": null,
//         "seller_notes": null,
//         "shipped_at": null,
//         "delivered_at": null,
//         "created_at": "2026-08-05T14:30:00.000000Z",
//         "can_confirm": true,
//         "can_ship": false,
//         "can_cancel": true,
//         "can_track": false,
//         "customer": {
//           "id": 7,
//           "name": "Priya Patel",
//           "email": "priya@example.com",
//           "mobile": "9123456789"
//         }
//       }
//     ],
//     "pagination": {
//       "total": 230,
//       "per_page": 15,
//       "current_page": 1,
//       "last_page": 16
//     },
//     "counts": {
//       "all": 230,
//       "pending": 12,
//       "confirmed": 8,
//       "processing": 5,
//       "shipped": 3,
//       "delivered": 200,
//       "cancelled": 2,
//       "returned": 0
//     }
//   }
// }
// ```[4:48 PM]---

// ## 19. Orders — Show

// ### `GET /api/seller/orders/{id}`

// Returns full order detail including line items, shipping address, and tracking history.

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "data": {
//     "id": 101,
//     "order_number": "ORD-2026-00101",
//     "status": "shipped",
//     "subtotal": 1299.00,
//     "commission_amount": 129.90,
//     "seller_amount": 1169.10,
//     "shipping_cost": 49.00,
//     "tracking_number": "DHLIND1234567",
//     "shipping_carrier": "DHL",
//     "shipped_at": "2026-08-06T08:00:00.000000Z",
//     "delivered_at": null,
//     "can_confirm": false,
//     "can_ship": false,
//     "can_cancel": false,
//     "can_track": true,
//     "customer": {
//       "id": 7,
//       "name": "Priya Patel",
//       "email": "priya@example.com",
//       "mobile": "9123456789"
//     },
//     "shipping_address": {
//       "name": "Priya Patel",
//       "phone": "9123456789",
//       "address": "456 Brigade Road",
//       "city": "Bengaluru",
//       "state": "Karnataka",
//       "postal_code": "560025",
//       "country": "India"
//     },
//     "items": [
//       {
//         "id": 201,
//         "product_id": 55,
//         "name": "Wireless Earbuds Pro",
//         "image_url": "https://...",
//         "quantity": 1,
//         "unit_price": 999.00,
//         "total": 999.00
//       }
//     ],
//     "tracking_updates": [
//       {
//         "status": "Picked Up",
//         "location": "Bengaluru Hub",
//         "description": "Package picked up by courier",
//         "timestamp": "2026-08-06T08:30:00.000000Z"
//       }
//     ],
//     "created_at": "2026-08-05T14:30:00.000000Z"
//   }
// }
// ```

// ---
// Status -list:
// GET : {{base_url}}api/seller/orders/1/status-list
// authorization : bearer_token {seller token}

// response:
// {
//     "status": 200,
//     "message": "Status list fetched successfully.",
//     "data": [
//         "processing",
//         "cancelled"
//     ]
// }
// ## 20. Orders — Update Status

// ### `PATCH /api/seller/orders/{id}/status`

// Updates the order status. Only valid transitions are allowed (see table below).

// **Body** — `application/json`

// | Field | Type | Required | Notes |
// |---|---|---|---|
// | `status` | string | :white_check_mark: | See allowed transitions below |
// | `notes` | string | :x: | Seller note / cancellation reason |
// | `tracking_number` | string | :x: | Required when marking as `shipped` (recommended) |
// | `shipping_carrier` | string | :x: | e.g. `DHL`, `BlueDart`, `Delhivery` |

// **Allowed Status Transitions**

// | Current Status | Can Move To |
// |---|---|
// | `pending` | `confirmed`, `cancelled` |
// | `confirmed` | `processing`, `cancelled` |
// | `processing` | `shipped` |
// | `shipped` | `delivered` |
// | `delivered` | *(terminal — no further changes)* |
// | `cancelled` | *(terminal)* |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Order status updated to Shipped.",
//   "data": {
//     "id": 101,
//     "order_number": "ORD-2026-00101",
//     "status": "shipped",
//     "tracking_number": "DHLIND1234567",
//     "shipping_carrier": "DHL",
//     "shipped_at": "2026-08-06T10:00:00.000000Z",
//     "can_ship": false,
//     "can_track": true
//   }
// }
// ```

// **Invalid Transition** — `422`

// ```json
// {
//   "status": 422,
//   "message": "Cannot transition from 'delivered' to 'cancelled'.",
//   "allowed": []
// }
// ```

// ---

// ## 21. Orders — Add Tracking

// ### `POST /api/seller/orders/{id}/tracking`

// Appends a tracking milestone to the order's tracking history. Only available when order `status` is `shipped`.

// **Body** — `application/json`

// | Field | Type | Required | Example |
// |---|---|---|---|
// | `status` | string | :white_check_mark: | `"In Transit"`, `"Out for Delivery"` |
// | `location` | string | :white_check_mark: | `"Mumbai Sorting Hub"` |
// | `description` | string | :x: | `"Package arrived at sorting facility"` |

// **Response** — `200`

// ```json
// {
//   "status": 200,
//   "message": "Tracking updated.",
//   "tracking": [
//     {
//       "status": "Picked Up",
//       "location": "Bengaluru Hub",
//       "description": "Package picked up",
//       "timestamp": "2026-08-06T08:30:00.000000Z"
//     },
//     {
//       "status": "In Transit",
//       "location": "Mumbai Sorting Hub",
//       "description": "Package arrived at sorting facility",
//       "timestamp": "2026-08-07T06:00:00.000000Z"
//     }
//   ]
// }
// ```

// ---
//22. Seller Notification :
// GET {{base_url}}api/seller/notifications
// authorization : bearer_token {seller_token}

// response:
// {
//     "status": 200,
//     "data": {
//         "current_page": 1,
//         "data": [
//             {
//                 "id": 17,
//                 "user_id": 76,
//                 "from_user_id": 82,
//                 "title": "New Order Received",
//                 "message": "You have received a new order #225965.",
//                 "type": "info",
//                 "event_type": "seller_new_order",
//                 "target_audience": "all",
//                 "with_email": false,
//                 "email_subject": null,
//                 "email_content": null,
//                 "image": null,
//                 "scheduled_at": null,
//                 "sent_at": "2026-09-16T13:30:55.000000Z",
//                 "status": "sent",
//                 "is_read": false,
//                 "read_at": null,
//                 "views": 0,
//                 "email_opens": 0,
//                 "created_at": "2026-09-16T13:30:55.000000Z",
//                 "updated_at": "2026-09-16T13:30:55.000000Z",
//                 "deleted_at": null
//             },
//             {
//                 "id": 15,
//                 "user_id": 76,
//                 "from_user_id": null,
//                 "title": "Test Notification",
//                 "message": "This is a test message to verify the notification system.",
//                 "type": "info",
//                 "event_type": "order_placed",
//                 "target_audience": "all",
//                 "with_email": false,
//                 "email_subject": null,
//                 "email_content": null,
//                 "image": null,
//                 "scheduled_at": null,
//                 "sent_at": "2026-09-16T12:15:54.000000Z",
//                 "status": "sent",
//                 "is_read": false,
//                 "read_at": null,
//                 "views": 0,
//                 "email_opens": 0,
//                 "created_at": "2026-09-16T12:15:54.000000Z",
//                 "updated_at": "2026-09-16T12:15:54.000000Z",
//                 "deleted_at": null
//             }
//         ],
//         "first_page_url": "https://deebazar.com/admin/api/seller/notifications?page=1",
//         "from": 1,
//         "last_page": 1,
//         "last_page_url": "https://deebazar.com/admin/api/seller/notifications?page=1",
//         "links": [
//             {
//                 "url": null,
//                 "label": "&laquo; Previous",
//                 "active": false
//             },
//             {
//                 "url": "https://deebazar.com/admin/api/seller/notifications?page=1",
//                 "label": "1",
//                 "active": true
//             },
//             {
//                 "url": null,
//                 "label": "Next &raquo;",
//                 "active": false
//             }
//         ],
//         "next_page_url": null,
//         "path": "https://deebazar.com/admin/api/seller/notifications",
//         "per_page": 20,
//         "prev_page_url": null,
//         "to": 2,
//         "total": 2
//     }
// }Rekha  [1:14 PM]

//23. Seller Notification Count:
// GET {{base_url}}api/seller/notifications/unread-count
// authorization : bearer_token {seller_token}

// response:
// {
//     "status": 200,
//     "unread_count": 2
// }
// 24.[1:18 PM]seller notification read

// POST : {{base_url}}api/notifications/read
// authorization : bearer_token {seller_token}

// body:
// id:15

// response :
// {
//     "status": 200,
//     "message": "Notification marked as read."
// } (edited) 
// Rekha  [1:30 PM]

//25.seller notification read all :

// POST : {{base_url}}api/notifications/read-all
// authorization : bearer_token {seller_token}

// response :
// {
//     "status": 200,
//     "message": "All notifications marked as read."
// }
// ## Error Reference

// All error responses follow a consistent structure:

// ```json
// {
//   "status": <http_code>,
//   "message": "Human readable description",
//   "errors": { "field": ["error detail"] }  // only on 422
// }
// ```

// 26.Seller Setting list :
// GET {{base_url}}api/seller/shipping-settings
// authorization : bearer_token

// response:
// {
//     "status": true,
//     "message": "Shipping settings retrieved successfully.",
//     "data": {
//         "free_shipping_above": "500.00",
//         "standard_delivery_rate": "40.00",
//         "express_delivery_rate": "90.00",
//         "order_processing_time": 2
//     }
// }
// 27.Seller Setting update :
// POST {{base_url}}api/seller/shipping-settings
// authorization : bearer_token
// body:
// {
//   "free_shipping_above": 500,
//   "standard_delivery_rate": 40,
//   "express_delivery_rate": 90,
//   "order_processing_time": 2
// }
// response:
// {
//     "status": true,
//     "message": "Shipping settings updated successfully.",
//     "data": {
//         "free_shipping_above": 500,
//         "standard_delivery_rate": 40,
//         "express_delivery_rate": 90,
//         "order_processing_time": 2
//     }
// }
// 26.[12:57 PM]Store Policy list :
// GET {{base_url}}api/seller/store-policies
// authorization : bearer_token

// response:
// {
//     "status": true,
//     "message": "Store return policies retrieved successfully.",
//     "data": [
//         {
//             "id": 5,
//             "title": "No Return",
//             "return_days": 0,
//             "description": "Products are not eligible for return."
//         },
//         {
//             "id": 1,
//             "title": "7 Days Return",
//             "return_days": 7,
//             "description": "Customers can return eligible products within 7 days of delivery."
//         },
//         {
//             "id": 2,
//             "title": "10 Days Return",
//             "return_days": 10,
//             "description": "Customers can return eligible products within 10 days of delivery."
//         },
//         {
//             "id": 3,
//             "title": "15 Days Return",
//             "return_days": 15,
//             "description": "Customers can return eligible products within 15 days of delivery."
//         },
//         {
//             "id": 4,
//             "title": "30 Days Return",
//             "return_days": 30,
//             "description": "Customers can return eligible products within 30 days of delivery."
//         }
//     ]
// }
// 27.seller setting update:
// POST :{{base_url}}api/seller/store-policies
// athorization : bearer_token

// body :
// store_policy_id:1

// response:
// {
//     "status": true,
//     "message": "Store policy updated successfully.",
//     "data": {
//         "store_policy_id": 1,
//         "policies": {
//             "policy_type": "return",
//             "title": "7 Days Return",
//             "return_days": 7,
//             "description": "Customers can return eligible products within 7 days of delivery."
//         }
//     }
// }
// 28.seller store policy :
// GET : {{base_url}}api/seller/store-policy
// authorization : bearer_token

// response:
// {
//     "status": true,
//     "message": "Store policy retrieved successfully.",
//     "data": {
//         "store_policy_id": 1,
//         "policies": {
//             "policy_type": "return",
//             "title": "7 Days Return",
//             "return_days": 7,
//             "description": "Customers can return eligible products within 7 days of delivery."
//         }
//     }
// }
// | HTTP Code | `status` | When It Occurs |
// |---|---|---|
// | 200 | 200 | Success |
// | 201 | 201 | Resource created |
// | 401 | 401 | Missing or invalid Bearer token / wrong password |
// | 403 | 403 | Authenticated but not authorized (wrong role, pending/suspended/rejected) |
// | 404 | 404 | Resource not found |
// | 409 | 409 | Conflict (e.g. deleting product with orders) |
// | 422 | 422 | Validation error — check `errors` object |
// | 500 | 500 | Server error — retry or contact support |

// ### Common 403 Scenarios

// ```json
// // Not a seller account
// { "status": 403, "message": "Access denied. Seller account required." }

// // Seller profile pending
// { "status": 403, "message": "Your seller account is under review.", "seller_status": "pending" }

// // Seller suspended
// { "status": 403, "message": "Your seller account has been suspended.", "seller_status": "suspended" }

// // Seller rejected
// { "status": 403, "message": "Your seller application was rejected. Reason: Invalid documents.", "seller_status": "rejected" }
// ```

// ---

// ## Status & Approval Flows

// ### Seller Registration Flow

// ```
// POST /api/seller/register
//         │
//         ▼
//   User created (status: active, approval_status: pending)
//   Seller created (status: pending)
//         │
//         ▼
//   Admin reviews in dashboard
//         │
//    ┌────┴────┐
//    ▼         ▼
// approved   rejected
//    │
//    ▼
// Seller can now access all protected endpoints
// ```

// ### Product Lifecycle

// ```
// POST /api/seller/products  →  approval_status: pending  →  is_active: false
//         │
//         ▼
//   Admin approves
//         │
//         ▼
//   approval_status: approved, is_active: true, visible to buyers
//         │
//   (seller edits name/category/description)
//         │
//         ▼
//   approval_status: pending again  →  hidden until re-approved
// ```

// ### Order Status Flow

// ```
// pending → confirmed → processing → shipped → delivered
//     └──────────────────────────────────────→ cancelled  (only from pending/confirmed)
// ```

// ---

// ## Quick Reference — All Endpoints

// | Method | Endpoint | Auth | Approved |
// |---|---|---|---|
// | POST | `/api/seller/register` | No | No |
// | POST | `/api/seller/login` | No | No |
// | GET | `/api/seller/me` | Yes | No |
// | POST | `/api/seller/logout` | Yes | No |
// | PUT | `/api/seller/account` | Yes | No |
// | GET | `/api/seller/profile` | Yes | No |
// | PUT | `/api/seller/profile` | Yes | **Yes** |
// | GET | `/api/seller/bank-details` | Yes | **Yes** |
// | PUT | `/api/seller/bank-details` | Yes | **Yes** |
// | PUT | `/api/seller/store-policies` | Yes | **Yes** |
// | PUT | `/api/seller/shipping-settings` | Yes | **Yes** |
// | GET | `/api/seller/wallet` | Yes | No |
// | GET | `/api/seller/dashboard` | Yes | **Yes** |
// | GET | `/api/seller/products` | Yes | **Yes** |
// | POST | `/api/seller/products` | Yes | **Yes** |
// | GET | `/api/seller/products/{id}` | Yes | **Yes** |
// | POST | `/api/seller/products/{id}` | Yes | **Yes** |
// | DELETE | `/api/seller/products/{id}` | Yes | **Yes** |
// | PATCH | `/api/seller/products/{id}/stock` | Yes | **Yes** |
// | GET | `/api/seller/orders` | Yes | **Yes** |
// | GET | `/api/seller/orders/{id}` | Yes | **Yes** |
// | PATCH | `/api/seller/orders/{id}/status` | Yes | **Yes** |
// | POST | `/api/seller/orders/{id}/tracking` | Yes | **Yes** |