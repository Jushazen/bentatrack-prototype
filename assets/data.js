// Sample data for the prototype. Everything here is made up. Money is in centavos
// (₱890.00 = 89000), the same way the real app stores it. This is only the starting point: once
// something changes, app.js saves all of it in the browser (localStorage) and loads that instead.
// Open index.html?reset to go back to this sample data.

const CATEGORIES = ["Bags", "Accessories", "Perfumes"];

const SUPPLIERS = [
  { id: "s1", name: "Calbayog Weavers Co-op", contactPerson: "Nida Tan", phone: "0917 555 0101", email: "orders@calbayogweavers.example", address: "Brgy. Obrero, Calbayog City, Samar" },
  { id: "s2", name: "Samar Scents Trading", contactPerson: "Ramon Uy", phone: "0928 555 0177", email: "", address: "Rizal Ave., Catbalogan City, Samar" },
  { id: "s3", name: "Tacloban Crafts Supply", contactPerson: "", phone: "053 555 0133", email: "sales@taclobancrafts.example", address: "" },
];

const USERS = [
  { id: "u1", name: "Ana Reyes", email: "owner@estetika.local", role: "OWNER", active: true, password: "12345678" },
  { id: "u2", name: "Joy Dela Cruz", email: "staff@estetika.local", role: "STAFF", active: true, password: "12345678" },
  { id: "u3", name: "Mark Lim", email: "mark@estetika.local", role: "STAFF", active: false, password: "12345678" },
];

// cost: purchase price (owner only). null = added by staff, still "Needs cost".
const PRODUCTS = [
  { id: "p01", code: "BAG-001", name: "Abaca Tote – Natural", category: "Bags", brand: "Estetika", supplier: "s1", cost: 45000, price: 89000, stock: 12, threshold: 5, barcode: "4800000000011", added: "2026-06-02" },
  { id: "p02", code: "BAG-002", name: "Buri Clutch – Cream", category: "Bags", brand: "Estetika", supplier: "s1", cost: 30000, price: 65000, stock: 4, threshold: 5, barcode: "4800000000028", added: "2026-06-02" },
  { id: "p03", code: "BAG-003", name: "Pandan Sling Bag – Brown", category: "Bags", brand: "Estetika", supplier: "s1", cost: 38000, price: 75000, stock: 9, threshold: 5, barcode: "4800000000035", added: "2026-06-10" },
  { id: "p04", code: "BAG-004", name: "Woven Backpack – Black", category: "Bags", brand: null, supplier: "s3", cost: 68000, price: 125000, stock: 0, threshold: 3, barcode: "4800000000042", added: "2026-06-18" },
  { id: "p05", code: "BAG-005", name: "Rattan Basket Bag – Small", category: "Bags", brand: null, supplier: "s3", cost: 52000, price: 98000, stock: 6, threshold: 5, barcode: null, added: "2026-07-01" },
  { id: "p06", code: "BAG-006", name: "Beaded Coin Pouch – Red", category: "Bags", brand: null, supplier: "s3", cost: 11000, price: 25000, stock: 3, threshold: 5, barcode: null, added: "2026-07-01" },
  { id: "p07", code: "BAG-007", name: "Leather Wallet – Tan", category: "Bags", brand: "Samar Leatherworks", supplier: null, cost: null, price: 115000, stock: 5, threshold: 5, barcode: "4800000000073", added: "2026-10-01" },
  { id: "p08", code: "ACC-001", name: "Silk Hair Clip – Blush", category: "Accessories", brand: null, supplier: "s3", cost: 4500, price: 12000, stock: 28, threshold: 8, barcode: "4800000000080", added: "2026-06-05" },
  { id: "p09", code: "ACC-002", name: "Pearl Drop Earrings", category: "Accessories", brand: "Estetika", supplier: "s3", cost: 15000, price: 35000, stock: 14, threshold: 5, barcode: "4800000000097", added: "2026-06-05" },
  { id: "p10", code: "ACC-003", name: "Shell Bracelet – Ivory", category: "Accessories", brand: null, supplier: "s3", cost: 7000, price: 18000, stock: 2, threshold: 5, barcode: null, added: "2026-06-22" },
  { id: "p11", code: "ACC-004", name: "Capiz Necklace – Gold", category: "Accessories", brand: "Estetika", supplier: "s3", cost: 19000, price: 42000, stock: 7, threshold: 5, barcode: "4800000000110", added: "2026-07-14" },
  { id: "p12", code: "ACC-005", name: "Silk Scarf – Leaf Print", category: "Accessories", brand: null, supplier: "s3", cost: 26000, price: 55000, stock: 0, threshold: 4, barcode: "4800000000127", added: "2026-07-14" },
  { id: "p13", code: "ACC-006", name: "Beaded Anklet – Turquoise", category: "Accessories", brand: null, supplier: "s3", cost: 6000, price: 15000, stock: 19, threshold: 5, barcode: null, added: "2026-08-03" },
  { id: "p14", code: "ACC-007", name: "Woven Headband – Natural", category: "Accessories", brand: null, supplier: "s1", cost: 7000, price: 16000, stock: 11, threshold: 5, barcode: null, added: "2026-08-03" },
  { id: "p15", code: "PER-001", name: "Citrus Cologne 30 ml", category: "Perfumes", brand: "Isla Scents", supplier: "s2", cost: 16000, price: 32000, stock: 10, threshold: 4, barcode: "4800000000158", added: "2026-06-12" },
  { id: "p16", code: "PER-002", name: "Sampaguita Eau de Parfum 50 ml", category: "Perfumes", brand: "Isla Scents", supplier: "s2", cost: 35000, price: 68000, stock: 5, threshold: 5, barcode: "4800000000165", added: "2026-06-12" },
  { id: "p17", code: "PER-003", name: "Ilang-Ilang Body Mist 100 ml", category: "Perfumes", brand: "Isla Scents", supplier: "s2", cost: 12000, price: 28000, stock: 16, threshold: 5, barcode: "4800000000172", added: "2026-07-20" },
  { id: "p18", code: "PER-004", name: "Vanilla Musk Roll-on 10 ml", category: "Perfumes", brand: null, supplier: "s2", cost: 6500, price: 15000, stock: 22, threshold: 6, barcode: null, added: "2026-07-20" },
  { id: "p19", code: "PER-005", name: "Coconut Oil Perfume 30 ml", category: "Perfumes", brand: null, supplier: "s2", cost: 14000, price: 30000, stock: 8, threshold: 5, barcode: null, added: "2026-08-15" },
  { id: "p20", code: "PER-006", name: "Calamansi Splash 100 ml", category: "Perfumes", brand: "Isla Scents", supplier: "s2", cost: 11000, price: 25000, stock: 1, threshold: 5, barcode: "4800000000202", added: "2026-08-15" },
];

// day: 0 = today, 1 = yesterday, … time: 24-hour shop time.
// discount: null, { type: "PERCENT", value: 10 } or { type: "AMOUNT", value: 5000 } (centavos).
const SALES = [
  { id: "1001", day: 0, time: "16:42", by: "u2", payment: "GCASH", customer: "", discount: null, items: [{ productId: "p08", qty: 2 }, { productId: "p13", qty: 1 }] },
  { id: "1000", day: 0, time: "15:10", by: "u1", payment: "CASH", customer: "Liza M. · 0917 555 0142", discount: { type: "PERCENT", value: 10 }, items: [{ productId: "p01", qty: 1 }, { productId: "p09", qty: 1 }] },
  { id: "0999", day: 0, time: "13:25", by: "u2", payment: "CASH", customer: "", discount: null, items: [{ productId: "p17", qty: 1 }] },
  { id: "0998", day: 0, time: "11:58", by: "u2", payment: "GCASH", customer: "", discount: { type: "AMOUNT", value: 5000 }, items: [{ productId: "p15", qty: 1 }, { productId: "p18", qty: 2 }] },
  { id: "0997", day: 0, time: "10:20", by: "u1", payment: "CASH", customer: "", discount: null, items: [{ productId: "p05", qty: 1 }] },
  { id: "0996", day: 1, time: "17:30", by: "u2", payment: "CASH", customer: "Rhea T.", discount: null, items: [{ productId: "p03", qty: 1 }, { productId: "p14", qty: 1 }] },
  { id: "0995", day: 1, time: "14:05", by: "u1", payment: "GCASH", customer: "", discount: null, items: [{ productId: "p16", qty: 1 }, { productId: "p11", qty: 1 }] },
  { id: "0994", day: 1, time: "10:45", by: "u2", payment: "CASH", customer: "", discount: null, items: [{ productId: "p08", qty: 3 }] },
  { id: "0993", day: 2, time: "16:00", by: "u1", payment: "GCASH", customer: "", discount: null, items: [{ productId: "p01", qty: 1 }] },
  { id: "0992", day: 2, time: "11:15", by: "u2", payment: "CASH", customer: "", discount: null, items: [{ productId: "p19", qty: 1 }, { productId: "p10", qty: 1 }] },
];

const REFUNDS = [
  { id: "r01", saleId: "0996", day: 1, time: "18:10", by: "u1", reason: "Wrong size", returnToStock: true, items: [{ productId: "p14", qty: 1 }] },
];

// Changes that are not sales or refunds. Sale and refund entries are added from the lists above.
const MANUAL_CHANGES = [
  { type: "RESTOCK", productId: "p01", delta: 6, day: 2, time: "09:30", by: "u2", note: "Delivery from Calbayog Weavers Co-op" },
  { type: "EDIT", productId: "p09", delta: 0, day: 3, time: "14:00", by: "u1", note: "Selling price ₱320.00 → ₱350.00" },
  { type: "RESTOCK", productId: "p17", delta: 10, day: 4, time: "10:05", by: "u2", note: "" },
  { type: "ARCHIVE", productId: null, productName: "Straw Hat – Wide Brim", productCode: "ACC-099", delta: 0, stockAfter: 3, day: 5, time: "15:40", by: "u1", note: "Discontinued" },
];
