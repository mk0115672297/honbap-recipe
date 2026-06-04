import sys

path = r'C:\Users\user\OneDrive\바탕 화면\honbap-recipe\src\App.jsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. import 추가
old1 = 'import { useState, useEffect, useRef } from "react";'
new1 = 'import { useState, useEffect, useRef } from "react";\nimport AIChatScreen from "./AIChatScreen";'
c = c.replace(old1, new1, 1)

# 2. ai 화면 라우팅 추가
old2 = '  if (screen === "list") return ('
new2 = '  if (screen === "ai") return (\n    <AIChatScreen onBack={() => setScreen("home")} />\n  );\n\n  if (screen === "list") return ('
c = c.replace(old2, new2, 1)

# 3. HomeScreen props에 onGoAI 추가
old3 = 'function HomeScreen({ recipes, onGoList, onSelect })'
new3 = 'function HomeScreen({ recipes, onGoList, onSelect, onGoAI })'
c = c.replace(old3, new3, 1)

# 4. HomeScreen 호출부에 onGoAI prop 추가
old4 = '      onSelect={openRecipe}\n    />'
new4 = '      onSelect={openRecipe}\n      onGoAI={() => setScreen("ai")}\n    />'
c = c.replace(old4, new4, 1)

# 5. AI 버튼 추가 (전체 레시피 보기 버튼 다음)
old5 = '          전체 레시피 보기 →\n        </button>'
new5 = '          전체 레시피 보기 →\n        </button>\n\n        <button onClick={onGoAI} style={{\n          width: "100%", padding: "16px", background: "var(--secondary)",\n          color: "#fff", borderRadius: "var(--radius)", fontSize: 16, fontWeight: 700,\n          marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,\n        }}>\n          <span>✨</span> AI 냉파 추천받기\n        </button>'
c = c.replace(old5, new5, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("패치 완료!")
print("AIChatScreen import:", "AIChatScreen" in c)
print("ai 라우팅:", 'screen === "ai"' in c)
print("onGoAI:", "onGoAI" in c)
