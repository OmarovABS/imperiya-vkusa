# NightBite - Static Food Delivery Website

A modern static food delivery website with WhatsApp order integration. No backend required - just open the HTML file in a browser!

## 🚀 Features

- **Static Website**: Works without any server - just open `static/index.html` in a browser
- **Product Catalog**: Browse food items by category (pizza, rolls, burgers, snacks)
- **WhatsApp Orders**: Orders are sent directly to WhatsApp with a formatted message
- **Responsive Design**: Mobile-friendly interface with PWA support
- **Easy Menu Management**: Edit menu directly in `static/js/menu-data.js`

## 🛠 Tech Stack

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with responsive design
- **HTML5** - Semantic markup

### No Backend Required
- No database needed
- No server setup
- Works on any static hosting (GitHub Pages, Netlify, Vercel, etc.)
- Can be opened directly as a file

## 📦 Installation & Usage

### Quick Start (No Installation Required)

1. Clone the repository:
```bash
git clone https://github.com/OmarovABS/imperiya-vkusa.git
cd imperiya-vkusa
```

2. Open the website:
   - **Option 1**: Double-click `static/index.html`
   - **Option 2**: Drag `static/index.html` into your browser
   - **Option 3**: Use a local server (optional):
     ```bash
     # Using Python
     cd static
     python -m http.server 8000
     # Then open http://localhost:8000
     ```

### Deploy to Static Hosting

#### GitHub Pages
1. Push the repository to GitHub
2. Go to Settings → Pages
3. Select `main` branch and `/static` folder as source
4. Your site will be available at `https://yourusername.github.io/imperiya-vkusa`

#### Netlify
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run: `netlify deploy --prod -d static`
3. Your site will be live instantly

#### Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel --prod`
3. Follow the prompts

## ⚙️ Configuration

### Change WhatsApp Number

Edit `static/js/script.js`, line 421:
```javascript
const WHATSAPP_NUMBER = '79898851080'; // Change to your number (without +)
```

### Edit Menu

Edit `static/js/menu-data.js` to add or modify dishes:
```javascript
const STATIC_MENU = {
  pizza: [
    {
      id: 1,
      name: 'Пепперони',
      desc: 'Описание блюда',
      price: 400,
      img: 'img/dishes/pizza.jpg', // or external URL
      alt: 'Пепперони',
      tag: 'Хит', // optional: 'Хит', 'Острый', 'Новинка'
      tagClass: 'tag-hit', // optional: 'tag-hit', 'tag-hot', 'tag-new'
      soldout: false
    }
  ],
  rolls: [],
  burgers: [],
  snacks: []
};
```

### Change Contact Information

Edit `static/index.html`:
- Phone number: lines 33, 297
- Address: lines 257, 293
- Store address (for pickup): `static/js/script.js`, line 420

## 📁 Project Structure

```
imperiya-vkusa/
├── static/                   # All website files
│   ├── index.html            # Main website
│   ├── privacy.html          # Privacy policy
│   ├── terms.html            # Terms of service
│   ├── manifest.webmanifest  # PWA manifest
│   ├── css/                  # Stylesheets
│   │   └── styles.css
│   ├── js/                   # JavaScript
│   │   ├── script.js         # Main functionality
│   │   └── menu-data.js      # Menu configuration
│   └── img/                  # Images
│       ├── logo.png
│       ├── icons/
│       ├── hero/
│       ├── quality/
│       └── dishes/           # Product images
├── app/                      # Backend (not needed for static version)
├── README.md
└── requirements.txt          # Not needed for static version
```

## ✨ How It Works

### Order Flow

1. **Customer browses menu** - Products are loaded from `menu-data.js`
2. **Adds items to cart** - Cart is stored in browser memory
3. **Fills order form** - Name, Email, Phone, Address
4. **Clicks "Confirm Order"** - WhatsApp opens with pre-filled message
5. **Message format**:
```
🍕 Новый заказ от NightBite

👤 Имя: [имя]
📧 Email: [email]
📱 Телефон: [телефон]
📍 Адрес: [адрес]

📦 Заказ:
• Пепперони × 2 — 800 ₽
• Филадельфия × 1 — 450 ₽

💰 Итого: 1250 ₽
```

### Menu Management

- All menu items are defined in `static/js/menu-data.js`
- To add a new dish, add it to the appropriate category array
- Images can be local (`img/dishes/photo.jpg`) or external URLs
- Categories: `pizza`, `rolls`, `burgers`, `snacks`

## 🎨 Customization

### Change Colors

Edit `static/css/styles.css` and modify CSS variables in `:root`:
```css
:root {
  --primary: #E8462A;
  --cream: #F3E8D6;
  /* ... */
}
```

### Change Logo

Replace `static/img/logo.png` with your logo.

### Add Product Images

Place product images in `static/img/dishes/` and reference them in `menu-data.js`.

## 📱 PWA Support

The site includes a PWA manifest for installation on mobile devices. To enable:
1. Ensure the site is served over HTTPS (required for PWA)
2. The manifest is already configured in `static/manifest.webmanifest`

## 🔒 Security Notes

- No sensitive data is stored on the server (there is no server)
- Orders are sent directly to WhatsApp
- Customer data is only shared via WhatsApp message
- For GDPR compliance, update `static/privacy.html` with your policy

## 📝 Development Notes

### Adding New Categories

1. Add the category to `STATIC_MENU` in `menu-data.js`
2. Add a tab button in `index.html` (around line 142)
3. Add a tab panel in `index.html` (around line 148)

### Testing Locally

For the best experience, use a local server:
```bash
cd static
python -m http.server 8000
# or with Node.js
npx serve
```

## 📄 License

MIT License
