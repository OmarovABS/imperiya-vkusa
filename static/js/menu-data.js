// ===================== МЕНЮ (статический режим) =====================
// Сайт работает полностью статично. Блюда загружаются из STATIC_MENU.
// Чтобы добавить или изменить блюда, редактируйте STATIC_MENU ниже.

const TAG_CLASS_MAP = { 'Хит': 'tag-hit', 'Острый': 'tag-hot', 'Новинка': 'tag-new' };

// Статическое меню. Добавляйте или изменяйте блюда здесь.
const STATIC_MENU = {
  pizza: [
    {
      id: 1,
      name: 'Пепперони',
      desc: 'Пицца «Пепперони» — это один из самых популярных и узнаваемых видов пиццы в мире, отличающийся своим минималистичным составом и пикантным, островатым вкусом',
      price: 400,
      img: 'img/hero/category-pizza.jpg',
      alt: 'Пепперони',
      tag: 'Хит',
      tagClass: 'tag-hit',
      soldout: false
    },
    {
      id: 2,
      name: 'Маргарита',
      desc: 'Классическая итальянская пицца с томатным соусом, моцареллой и свежим базиликом',
      price: 350,
      img: 'img/hero/category-pizza.jpg',
      alt: 'Маргарита',
      tag: '',
      tagClass: '',
      soldout: false
    },
    {
      id: 3,
      name: 'Четыре сыра',
      desc: 'Пицца с четырьмя видами сыра: моцарелла, пармезан, горгонзола и чеддер',
      price: 450,
      img: 'img/hero/category-pizza.jpg',
      alt: 'Четыре сыра',
      tag: '',
      tagClass: '',
      soldout: false
    }
  ],
  rolls: [
    {
      id: 4,
      name: 'Филадельфия',
      desc: 'Классический ролл с лососем, сливочным сыром и огурцом',
      price: 450,
      img: 'img/hero/category-rolls.jpg',
      alt: 'Филадельфия',
      tag: 'Хит',
      tagClass: 'tag-hit',
      soldout: false
    },
    {
      id: 5,
      name: 'Дракон',
      desc: 'Ролл с угрем, авокадо и огурцом, сверху унаги соус',
      price: 480,
      img: 'img/hero/category-rolls.jpg',
      alt: 'Дракон',
      tag: 'Острый',
      tagClass: 'tag-hot',
      soldout: false
    },
    {
      id: 6,
      name: 'Калифорния',
      desc: 'Ролл с крабом, авокадо и огурцом, сверху икра',
      price: 420,
      img: 'img/hero/category-rolls.jpg',
      alt: 'Калифорния',
      tag: '',
      tagClass: '',
      soldout: false
    }
  ],
  burgers: [
    {
      id: 7,
      name: 'Чизбургер',
      desc: 'Сочный бургер с говяжьей котлетой, сыром чеддер, салатом и соусом',
      price: 320,
      img: 'img/hero/category-burgers.jpg',
      alt: 'Чизбургер',
      tag: 'Хит',
      tagClass: 'tag-hit',
      soldout: false
    },
    {
      id: 8,
      name: 'Двойной чизбургер',
      desc: 'Две говяжьи котлеты, двойной чеддер, салат, помидор и специальный соус',
      price: 420,
      img: 'img/hero/category-burgers.jpg',
      alt: 'Двойной чизбургер',
      tag: '',
      tagClass: '',
      soldout: false
    },
    {
      id: 9,
      name: 'Острый бургер',
      desc: 'Бургер с халапеньо, острым соусом и говяжьей котлетой',
      price: 380,
      img: 'img/hero/category-burgers.jpg',
      alt: 'Острый бургер',
      tag: 'Острый',
      tagClass: 'tag-hot',
      soldout: false
    }
  ],
  snacks: [
    {
      id: 10,
      name: 'Картофель фри',
      desc: 'Хрустящий картофель фри с соусом на выбор',
      price: 150,
      img: 'img/hero/category-snacks.jpg',
      alt: 'Картофель фри',
      tag: '',
      tagClass: '',
      soldout: false
    },
    {
      id: 11,
      name: 'Куриные крылышки',
      desc: 'Сочные куриные крылышки в соусе барбекю',
      price: 280,
      img: 'img/hero/category-snacks.jpg',
      alt: 'Куриные крылышки',
      tag: 'Хит',
      tagClass: 'tag-hit',
      soldout: false
    },
    {
      id: 12,
      name: 'Наггетсы',
      desc: 'Куриные наггетсы с хрустящей корочкой',
      price: 220,
      img: 'img/hero/category-snacks.jpg',
      alt: 'Наггетсы',
      tag: 'Новинка',
      tagClass: 'tag-new',
      soldout: false
    }
  ]
};
// Функция возвращает статическое меню
async function fetchMenuData() {
  return STATIC_MENU;
}