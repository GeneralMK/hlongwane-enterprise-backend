# REST API v1

## Auth
POST /api/v1/auth/register
GET /api/v1/auth/me

## Users / RBAC
GET /api/v1/users
GET /api/v1/users/:id
PATCH /api/v1/users/:id
GET /api/v1/roles
POST /api/v1/roles/users/:userId
DELETE /api/v1/roles/users/:userId/:roleId

## Catalogue
GET /api/v1/brands
GET /api/v1/brands/:id
POST /api/v1/brands
PATCH /api/v1/brands/:id

GET /api/v1/categories
GET /api/v1/categories/:id
POST /api/v1/categories
PATCH /api/v1/categories/:id

GET /api/v1/products
GET /api/v1/products/:id
POST /api/v1/products
PATCH /api/v1/products/:id
DELETE /api/v1/products/:id

GET /api/v1/product-variants/products/:productId
GET /api/v1/product-variants/:id
POST /api/v1/product-variants
PATCH /api/v1/product-variants/:id

## Inventory
GET /api/v1/inventory
GET /api/v1/inventory/:variantId
POST /api/v1/inventory/:variantId/adjust

## Cart
GET /api/v1/carts/me
POST /api/v1/carts/me/items
PATCH /api/v1/carts/me/items/:itemId
DELETE /api/v1/carts/me/items/:itemId

## Orders
GET /api/v1/orders/me
GET /api/v1/orders/:id
POST /api/v1/orders/checkout
GET /api/v1/orders
PATCH /api/v1/orders/:id/status
POST /api/v1/orders/:id/cancel

## Shipments
GET /api/v1/shipments/:id
POST /api/v1/shipments
PATCH /api/v1/shipments/:id

## Payments
POST /api/v1/payments/checkout
GET /api/v1/payments/:id
GET /api/v1/payments/reference/:reference
POST /api/v1/payments/:id/refund

## Webhooks
POST /api/v1/webhooks/paystack
POST /api/v1/webhooks/payflex
POST /api/v1/webhooks/payfast
POST /api/v1/webhooks/ozow

## Returns
POST /api/v1/returns
GET /api/v1/returns/:id
POST /api/v1/returns/:id/approve
POST /api/v1/returns/:id/reject

## Notifications
GET /api/v1/notifications/me

## Audit
GET /api/v1/audit
