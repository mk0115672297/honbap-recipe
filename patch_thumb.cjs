const fs = require('fs');
const path = 'src/App.jsx';
let c = fs.readFileSync(path, 'utf8');

// RecipeCard 이미지 src 교체
const old1 = `src={(CATEGORY_IMG[recipe.category] || CATEGORY_IMG['한식']) + '?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop'}`;
const new1 = `src={(recipe.thumbnail_url || CATEGORY_IMG[recipe.category] || CATEGORY_IMG['한식']) + '?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop'}`;

const count = (c.split(old1).length - 1);
console.log('교체할 패턴 수:', count);

c = c.replaceAll(old1, new1);

fs.writeFileSync(path, c, 'utf8');
console.log('완료!');
