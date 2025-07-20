const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

app.use(express.static('Public'));
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('WELCOME TO AUTO_MACH BACKEND!');
});

// ✅ Gmail credentials (replace with your own)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'akshatfreelancer879@gmail.com',
    pass: 'iwwkovgeimphwbor',
  },
});

// ✅ MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'webuser',
  password: 'webpassword',
  database: 'auto_machinery_spares',
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
    return;
  }
  console.log('✅ Connected to MySQL');
});

// ✅ POST /order route
app.post('/order', (req, res) => {
  const { name, email, gst, contactnumber, address, items } = req.body;

  if (!name || !email || !gst || !contactnumber || !address || !items || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Missing or invalid fields in request' });
  }

  // ✅ Calculate grand total
  let grandTotal = 0;
  let itemDetails = '';
  items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    grandTotal += itemTotal;
    itemDetails += `- ${item.name} (₹${item.price} × ${item.quantity}) = ₹${itemTotal}\n`;
  });

  // ✅ Insert into amsco_orders table
  const sql = `
    INSERT INTO amsco_orders 
    (name, email, gst, contactnumber, address, items, grandtotal) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [name, email, gst, contactnumber, address, JSON.stringify(items), grandTotal], (err, result) => {
    if (err) {
      console.error('❌ Error storing order:', err.sqlMessage || err.message);
      return res.status(500).json({ message: 'Failed to store order', error: err.sqlMessage });
    }

    const id = result.insertId;

    // ✅ Compose email
    const mailOptions = {
      from: 'akshatfreelancer879@gmail.com',
      to: email,
      subject: `Order Confirmation - AMSCO (Order ID: ${id})`,
      text: `Dear ${name},

Thank you for your order!

Order ID: ${id}
Name: ${name}
GST Number: ${gst}
Contact Number: ${contactnumber}
Address: ${address}

Ordered Items:
${itemDetails}
Grand Total: ₹${grandTotal}

We will process your order shortly.

Regards,
AMSCO Team`
    };

    // ✅ Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Email error:', error);
        return res.status(500).json({
          message: 'Order saved, but failed to send email',
          error: error.message,
        });
      } else {
        console.log('✅ Email sent:', info.response);
        return res.status(200).json({
          message: 'Order stored and email sent successfully',
          id,
          grandTotal
        });
      }
    });
  });
});

// ✅ Start server
app.listen(port, 'localhost', () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

