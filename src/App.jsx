import { useState, useEffect, useRef } from "react";
import AIChatScreen from "./AIChatScreen";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ───────────────────────────────────────────────
const SUPABASE_URL = "https://bsvggbgodbddgvsvxvkn.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── 앱인토스 인앱결제 상수 ───────────────────────────────────
const PRODUCT_ID = "sub.tvj.mq074xmz.c79e044982";

// ─── 앱인토스 인앱광고 상수 ───────────────────────────────────
const AD_UNIT_ID = "ait.v2.live.39bf975f80c24f57"; // 전면광고

// 전면광고 노출 함수
async function showInterstitialAd() {
  try {
    const { Ad } = await import("@apps-in-toss/web-framework");
    const ad = await Ad.loadInterstitial({ adUnitId: AD_UNIT_ID });
    await ad.show();
  } catch (e) {
    console.warn("광고 로드 실패 (앱 외부 환경):", e);
  }
}

// ─── 카테고리 아이콘 ──────────────────────────────────────────
const CATEGORY_EMOJI = {
  전체: "🍽️", 한식: "🥢", "국/찌개": "🍲", 볶음: "🥘",
  양식: "🍝", 일식: "🍜", 중식: "🥡", 샐러드: "🥗", 간식: "🍡",
};

const CATEGORY_IMG = {
  '한식': 'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg',
  '국/찌개': 'https://images.pexels.com/photos/3622608/pexels-photo-3622608.jpeg',
  '볶음': 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
  '양식': 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
  '일식': 'https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg',
  '중식': 'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg',
  '샐러드': 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg',
  '간식': 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg',
};

const DIFFICULTY_COLOR = { 쉬움: "#4CAF50", 보통: "#FF9800", 어려움: "#F44336" };

// ─── 전역 스타일 ──────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Gowun+Dodum&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #FFF8F0;
      --surface: #FFFFFF;
      --surface2: #FFF3E8;
      --primary: #FF6B35;
      --primary-soft: #FFE5D9;
      --secondary: #2D3A2E;
      --text: #1A1A1A;
      --text-muted: #888;
      --border: #F0E8DF;
      --shadow: 0 2px 12px rgba(255,107,53,0.10);
      --radius: 16px;
      --font: 'Noto Sans KR', sans-serif;
      --font-display: 'Gowun Dodum', serif;
    }
    html, body, #root { height: 100%; background: var(--bg); font-family: var(--font); color: var(--text); }
    button { border: none; cursor: pointer; font-family: var(--font); }
    input { font-family: var(--font); }

    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
    @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }

    .slide-up { animation: slideUp 0.35s cubic-bezier(.22,.68,0,1.2); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }

    /* 스크롤바 */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  `}</style>
);

// ─── 앱인토스 인앱결제 훅 (공식 SDK: createSubscriptionPurchaseOrder) ────
function useSubscription() {
  const [isPremium, setIsPremium] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // 앱 시작 시 구독 상태 확인
  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      // 공식 SDK로 완료된 주문 조회
      const { IAP } = await import("@apps-in-toss/web-framework");
      const orders = await IAP.getCompletedOrRefundedOrders();
      if (orders?.orders?.some(
        (o) => o.sku === PRODUCT_ID && o.status === "COMPLETED"
      )) {
        setIsPremium(true);
        return;
      }
    } catch (_) {}

    // fallback: Supabase에서 구독 확인
    try {
      const userId = window.__ait_user?.id || window.__ait_user?.userId;
      if (userId) {
        const { data } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();
        if (data) setIsPremium(true);
      }
    } catch (_) {}
  }

  async function saveSubscription(paymentData) {
    try {
      const userId = window.__ait_user?.id || window.__ait_user?.userId;
      if (!userId) return;
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        product_id: PRODUCT_ID,
        is_active: true,
        started_at: new Date().toISOString(),
        payment_data: paymentData,
      }, { onConflict: "user_id" });
    } catch (_) {}
  }

  async function purchase() {
    setPurchasing(true);
    try {
      const { IAP } = await import("@apps-in-toss/web-framework");
      // 자동갱신 구독 전용 API 사용
      const cleanup = IAP.createSubscriptionPurchaseOrder({
        options: {
          sku: PRODUCT_ID,
          processProductGrant: ({ orderId, subscriptionId }) => {
            console.log("구독 지급:", orderId, subscriptionId);
            saveSubscription({ orderId, subscriptionId });
            return true;
          },
        },
        onEvent: (event) => {
          console.log("구독 성공:", event);
          setIsPremium(true);
          setPurchasing(false);
          cleanup();
        },
        onError: (error) => {
          console.error("구독 실패:", error);
          setPurchasing(false);
          alert("결제에 실패했어요. 다시 시도해주세요.");
          cleanup();
        },
      });
    } catch (e) {
      console.error("결제 오류:", e);
      setPurchasing(false);
      alert("앱에서만 결제할 수 있어요.");
    }
  }

  return { isPremium, purchasing, purchase, checkSubscription };
}

// ─── 프리미엄 페이월 모달 ─────────────────────────────────────
function PaywallModal({ onClose, onPurchase, purchasing }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      zIndex: 1000, display: "flex", alignItems: "flex-end",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="slide-up" style={{
        width: "100%", background: "#fff", borderRadius: "24px 24px 0 0",
        padding: "28px 24px 48px",
      }}>
        <GlobalStyle />
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✨</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>프리미엄 구독</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
            AI 냉파 추천과 음성 조리 안내를<br />무제한으로 이용하세요
          </p>
        </div>

        {/* 혜택 목록 */}
        <div style={{ background: "var(--surface2)", borderRadius: 14, padding: "16px", marginBottom: 20 }}>
          {[
            ["🤖", "AI 냉파 레시피 추천", "냉장고 재료로 맞춤 레시피"],
            ["🔊", "음성 조리 안내", "손 없이 요리에 집중"],
            ["✨", "프리미엄 레시피", "셰프 특급 레시피 전체 공개"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 22, minWidth: 32, textAlign: "center" }}>{icon}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{title}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onPurchase}
          disabled={purchasing}
          style={{
            width: "100%", padding: "18px",
            background: purchasing ? "#ccc" : "linear-gradient(135deg, #FF6B35, #FF9A5C)",
            color: "#fff", borderRadius: "var(--radius)", fontSize: 17, fontWeight: 800,
            boxShadow: purchasing ? "none" : "0 4px 16px rgba(255,107,53,0.4)",
          }}>
          {purchasing ? "결제 진행 중..." : "월 4,906원으로 시작하기 →"}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
          언제든지 해지 가능 · 자동 갱신 구독
        </p>
        <button onClick={onClose} style={{
          width: "100%", padding: "12px", background: "none",
          color: "var(--text-muted)", fontSize: 14, marginTop: 4,
        }}>
          나중에
        </button>
      </div>
    </div>
  );
}

// ─── 메인 앱 ─────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [recipes, setRecipes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [steps, setSteps] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [category, setCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [cookStep, setCookStep] = useState(0);
  const [timer, setTimer] = useState(null);
  const [timerLeft, setTimerLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const timerRef = useRef(null);

  const { isPremium, purchasing, purchase } = useSubscription();

  // 레시피 목록 로드
  useEffect(() => {
    if (screen === "list" || screen === "home") loadRecipes();
  }, [screen]);

  async function loadRecipes() {
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: true });
    setRecipes(data || []);
    setFiltered(data || []);
    setLoading(false);
  }

  // 검색/카테고리 필터
  useEffect(() => {
    let r = recipes;
    if (category !== "전체") r = r.filter((x) => x.category === category);
    if (search.trim()) r = r.filter((x) => x.title.includes(search) || (x.tags || []).join("").includes(search));
    setFiltered(r);
  }, [category, search, recipes]);

  // 레시피 상세 로드 (프리미엄 체크)
  async function openRecipe(recipe) {
    if (recipe.is_premium && !isPremium) {
      setShowPaywall(true);
      return;
    }
    setSelected(recipe);
    const [{ data: ing }, { data: stp }] = await Promise.all([
      supabase.from("recipe_ingredients").select("*").eq("recipe_id", recipe.id).order("sort_order"),
      supabase.from("recipe_steps").select("*").eq("recipe_id", recipe.id).order("step_number"),
    ]);
    setIngredients(ing || []);
    setSteps(stp || []);
    setScreen("detail");
  }

  // AI 화면 이동 (프리미엄 체크)
  function goAI() {
    if (!isPremium) { setShowPaywall(true); return; }
    setScreen("ai");
  }

  // 조리 모드
  async function startCook() {
    // 조리 시작 전 전면광고 노출
    await showInterstitialAd();
    setCookStep(0);
    setScreen("cook");
    const s = steps[0];
    if (s?.duration_seconds) { setTimerLeft(s.duration_seconds); setTimer(s.duration_seconds); }
    else { setTimerLeft(0); setTimer(null); }
    setTimerRunning(false);
  }

  function goStep(n) {
    clearInterval(timerRef.current);
    setTimerRunning(false);
    setCookStep(n);
    const s = steps[n];
    if (s?.duration_seconds) { setTimerLeft(s.duration_seconds); setTimer(s.duration_seconds); }
    else { setTimerLeft(0); setTimer(null); }
  }

  function toggleTimer() {
    if (timerRunning) {
      clearInterval(timerRef.current);
      setTimerRunning(false);
    } else {
      setTimerRunning(true);
      timerRef.current = setInterval(() => {
        setTimerLeft((p) => {
          if (p <= 1) { clearInterval(timerRef.current); setTimerRunning(false); return 0; }
          return p - 1;
        });
      }, 1000);
    }
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── 화면 렌더 ──────────────────────────────────────────────
  if (screen === "cook" && selected) return (
    <>
      <CookMode
        recipe={selected}
        steps={steps}
        cookStep={cookStep}
        goStep={goStep}
        timer={timer}
        timerLeft={timerLeft}
        timerRunning={timerRunning}
        toggleTimer={toggleTimer}
        fmt={fmt}
        onBack={() => { clearInterval(timerRef.current); setScreen("detail"); }}
      />
    </>
  );

  if (screen === "detail" && selected) return (
    <>
      <DetailScreen
        recipe={selected}
        ingredients={ingredients}
        steps={steps}
        onBack={() => setScreen("list")}
        onCook={startCook}
      />
    </>
  );

  if (screen === "ai") return (
    <AIChatScreen onBack={() => setScreen("home")} />
  );

  if (screen === "list") return (
    <>
      <ListScreen
        recipes={filtered}
        allRecipes={recipes}
        category={category}
        setCategory={setCategory}
        search={search}
        setSearch={setSearch}
        loading={loading}
        onSelect={openRecipe}
        isPremium={isPremium}
        onBack={() => setScreen("home")}
      />
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onPurchase={() => { purchase(); }}
          purchasing={purchasing}
        />
      )}
    </>
  );

  return (
    <>
      <HomeScreen
        recipes={recipes}
        onGoList={() => setScreen("list")}
        onSelect={openRecipe}
        onGoAI={goAI}
        isPremium={isPremium}
        onShowPaywall={() => setShowPaywall(true)}
      />
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onPurchase={() => { purchase(); }}
          purchasing={purchasing}
        />
      )}
    </>
  );
}

// ─── 홈 화면 ─────────────────────────────────────────────────
function HomeScreen({ recipes, onGoList, onSelect, onGoAI, isPremium, onShowPaywall }) {
  const quick = recipes.filter((r) => r.cooking_time <= 10).slice(0, 4);
  const easy = recipes.filter((r) => r.difficulty === "쉬움").slice(0, 4);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <GlobalStyle />
      {/* 헤더 */}
      <div style={{
        background: "linear-gradient(135deg, #FF6B35 0%, #FF9A5C 100%)",
        padding: "48px 20px 32px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 140, height: 140,
          background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -30, left: -10, width: 100, height: 100,
          background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 4, fontFamily: "var(--font-display)" }}>
              오늘 뭐 먹지? 🍳
            </p>
            <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, lineHeight: 1.2, fontFamily: "var(--font-display)" }}>
              혼밥레시피
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6 }}>
              혼자 먹어도 맛있게 · {recipes.length}가지 레시피
            </p>
          </div>
          {isPremium && (
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 12px",
              fontSize: 12, color: "#fff", fontWeight: 700 }}>
              ✨ 프리미엄
            </div>
          )}
        </div>

        {/* 검색창 */}
        <div onClick={onGoList} style={{
          marginTop: 20, background: "#fff", borderRadius: 12, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ color: "#aaa", fontSize: 14 }}>레시피 검색...</span>
        </div>
      </div>

      <div style={{ padding: "0 16px 100px" }}>
        {/* 빠른 요리 */}
        <Section title="⚡ 10분 이하" onMore={onGoList}>
          <HorizontalScroll>
            {quick.map((r) => <QuickCard key={r.id} recipe={r} onClick={() => onSelect(r)} />)}
          </HorizontalScroll>
        </Section>

        {/* 쉬운 레시피 */}
        <Section title="😊 초보도 쉽게" onMore={onGoList}>
          <HorizontalScroll>
            {easy.map((r) => <QuickCard key={r.id} recipe={r} onClick={() => onSelect(r)} />)}
          </HorizontalScroll>
        </Section>

        {/* 전체보기 버튼 */}
        <button onClick={onGoList} style={{
          width: "100%", padding: "16px", background: "var(--primary)",
          color: "#fff", borderRadius: "var(--radius)", fontSize: 16, fontWeight: 700,
          marginTop: 8, boxShadow: "0 4px 16px rgba(255,107,53,0.35)",
        }}>
          전체 레시피 보기 →
        </button>

        {/* AI 버튼 - 프리미엄 여부에 따라 다르게 */}
        <button onClick={onGoAI} style={{
          width: "100%", padding: "16px", background: "var(--secondary)",
          color: "#fff", borderRadius: "var(--radius)", fontSize: 16, fontWeight: 700,
          marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span>✨</span>
          {isPremium ? "AI 냉파 추천받기" : "AI 냉파 추천받기 🔒"}
        </button>

        {/* 프리미엄 배너 - 미구독자만 표시 */}
        {!isPremium && (
          <div onClick={onShowPaywall} style={{
            marginTop: 16, background: "linear-gradient(135deg, #2D3A2E, #4A5E4A)",
            borderRadius: "var(--radius)", padding: "20px", color: "#fff", cursor: "pointer",
          }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>PREMIUM</p>
            <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>AI 냉파 추천 · 음성 조리 안내</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 14 }}>
              냉장고 속 재료만 입력하면 AI가 레시피를 추천해드려요
            </p>
            <div style={{
              display: "inline-block", background: "var(--primary)", borderRadius: 8,
              padding: "8px 16px", fontSize: 13, fontWeight: 700,
            }}>
              월 4,906원으로 시작하기 ✨
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 레시피 목록 화면 ─────────────────────────────────────────
function ListScreen({ recipes, allRecipes, category, setCategory, search, setSearch, loading, onSelect, isPremium, onBack }) {
  const categories = ["전체", "한식", "국/찌개", "볶음", "양식", "일식", "중식", "샐러드", "간식"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <GlobalStyle />
      {/* 상단 */}
      <div style={{ background: "var(--surface)", padding: "16px 16px 0", position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: "none", fontSize: 22, padding: 4 }}>←</button>
          <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>레시피 {allRecipes.length}가지</h2>
        </div>
        {/* 검색 */}
        <div style={{ background: "var(--surface2)", borderRadius: 12, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="재료, 요리명 검색..."
            style={{ border: "none", background: "none", outline: "none", fontSize: 14, flex: 1, color: "var(--text)" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", color: "var(--text-muted)", fontSize: 16 }}>✕</button>}
        </div>
        {/* 카테고리 탭 */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              background: category === c ? "var(--primary)" : "var(--surface2)",
              color: category === c ? "#fff" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>
              {CATEGORY_EMOJI[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* 레시피 그리드 */}
      <div style={{ padding: "12px 16px 100px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>불러오는 중...</div>
        ) : recipes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 40 }}>🍽️</p>
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>검색 결과가 없어요</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} onClick={() => onSelect(r)} isPremium={isPremium} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 레시피 상세 화면 ─────────────────────────────────────────
function DetailScreen({ recipe, ingredients, steps, onBack, onCook }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }} className="fade-in">
      <GlobalStyle />
      {/* 썸네일 헤더 */}
      <div style={{
        height: 220, background: `linear-gradient(135deg, #FF6B35, #FF9A5C)`,
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 72 }}>{CATEGORY_EMOJI[recipe.category] || "🍳"}</span>
        <button onClick={onBack} style={{
          position: "absolute", top: 16, left: 16, background: "rgba(255,255,255,0.9)",
          borderRadius: "50%", width: 36, height: 36, fontSize: 18, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>←</button>
      </div>

      <div style={{ padding: "20px 16px 120px" }}>
        {/* 기본 정보 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <Tag color={DIFFICULTY_COLOR[recipe.difficulty]}>{recipe.difficulty}</Tag>
          <Tag color="#2196F3">⏱ {recipe.cooking_time}분</Tag>
          {recipe.calories && <Tag color="#9C27B0">🔥 {recipe.calories}kcal</Tag>}
          {recipe.is_premium && <Tag color="#FF9800">✨ 프리미엄</Tag>}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>{recipe.title}</h1>
        {recipe.description && (
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
            {recipe.description}
          </p>
        )}
        {/* 태그 */}
        {recipe.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {recipe.tags.map((t) => (
              <span key={t} style={{ background: "var(--primary-soft)", color: "var(--primary)",
                borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600 }}>
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* 재료 */}
        <Card title="🛒 재료">
          {ingredients.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>재료 정보 준비 중...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ingredients.map((ing) => (
                <div key={ing.id} style={{ display: "flex", justifyContent: "space-between",
                  background: "var(--surface2)", borderRadius: 8, padding: "8px 10px" }}>
                  <span style={{ fontSize: 13 }}>{ing.name}{ing.is_optional && " (선택)"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{ing.amount}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 조리 단계 */}
        <Card title="📋 만드는 법">
          {steps.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>조리 순서 준비 중...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {steps.map((s) => (
                <div key={s.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 28, height: 28, background: "var(--primary)", color: "#fff",
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {s.step_number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, lineHeight: 1.6 }}>{s.instruction}</p>
                    {s.tip && <p style={{ fontSize: 12, color: "var(--primary)", marginTop: 4 }}>💡 {s.tip}</p>}
                    {s.duration_seconds && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                        ⏱ {Math.floor(s.duration_seconds / 60)}분 {s.duration_seconds % 60 > 0 ? `${s.duration_seconds % 60}초` : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 조리 시작 버튼 */}
      {steps.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px",
          background: "var(--bg)", boxShadow: "0 -4px 16px rgba(0,0,0,0.08)" }}>
          <button onClick={onCook} style={{
            width: "100%", padding: "16px", background: "var(--primary)", color: "#fff",
            borderRadius: "var(--radius)", fontSize: 17, fontWeight: 800,
            boxShadow: "0 4px 16px rgba(255,107,53,0.4)",
          }}>
            🍳 조리 시작하기
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 조리 모드 화면 ───────────────────────────────────────────
function CookMode({ recipe, steps, cookStep, goStep, timer, timerLeft, timerRunning, toggleTimer, fmt, onBack }) {
  const step = steps[cookStep];
  const progress = ((cookStep) / steps.length) * 100;
  const timerProgress = timer ? ((timer - timerLeft) / timer) * 100 : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#1A1A1A", color: "#fff" }} className="slide-up">
      <GlobalStyle />
      {/* 상단 바 */}
      <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", borderRadius: "50%",
          width: 36, height: 36, fontSize: 18, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ✕
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{recipe.title}</p>
          {/* 진행 바 */}
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 6 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--primary)", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{cookStep + 1}/{steps.length}</span>
      </div>

      {/* 단계 내용 */}
      <div style={{ padding: "20px 20px", flex: 1 }} key={cookStep} className="fade-in">
        <div style={{ background: "var(--primary)", borderRadius: "50%", width: 52, height: 52,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          fontWeight: 900, marginBottom: 20 }}>
          {cookStep + 1}
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.5, marginBottom: 12 }}>
          {step?.instruction}
        </p>
        {step?.tip && (
          <div style={{ background: "rgba(255,107,53,0.15)", borderRadius: 10, padding: "10px 14px",
            borderLeft: "3px solid var(--primary)", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#FFB38A" }}>💡 {step.tip}</p>
          </div>
        )}
      </div>

      {/* 타이머 */}
      {timer && (
        <div style={{ margin: "0 20px 20px", background: "rgba(255,255,255,0.06)",
          borderRadius: "var(--radius)", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>TIMER</p>
          {/* 원형 타이머 */}
          <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 12px" }}>
            <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--primary)" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - timerProgress / 100)}`}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 22, fontWeight: 800, fontFamily: "monospace" }}>
              {fmt(timerLeft)}
            </div>
          </div>
          <button onClick={toggleTimer} style={{
            background: timerRunning ? "rgba(255,255,255,0.1)" : "var(--primary)",
            color: "#fff", borderRadius: 10, padding: "8px 24px", fontSize: 14, fontWeight: 700,
          }}>
            {timerRunning ? "⏸ 일시정지" : timerLeft === 0 ? "✅ 완료" : "▶ 시작"}
          </button>
        </div>
      )}

      {/* 이전/다음 버튼 */}
      <div style={{ padding: "0 20px 40px", display: "flex", gap: 12 }}>
        <button onClick={() => goStep(cookStep - 1)} disabled={cookStep === 0}
          style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.08)", color: "#fff",
            borderRadius: "var(--radius)", fontSize: 15, fontWeight: 600,
            opacity: cookStep === 0 ? 0.3 : 1 }}>
          ← 이전
        </button>
        {cookStep < steps.length - 1 ? (
          <button onClick={() => goStep(cookStep + 1)}
            style={{ flex: 2, padding: "14px", background: "var(--primary)", color: "#fff",
              borderRadius: "var(--radius)", fontSize: 15, fontWeight: 700 }}>
            다음 단계 →
          </button>
        ) : (
          <button onClick={onBack}
            style={{ flex: 2, padding: "14px", background: "#4CAF50", color: "#fff",
              borderRadius: "var(--radius)", fontSize: 15, fontWeight: 700 }}>
            🎉 완성!
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 공통 컴포넌트 ────────────────────────────────────────────
function RecipeCard({ recipe, onClick, isPremium }) {
  const locked = recipe.is_premium && !isPremium;
  return (
    <div onClick={onClick} className="fade-in" style={{
      background: "var(--surface)", borderRadius: "var(--radius)", overflow: "hidden",
      boxShadow: "var(--shadow)", cursor: "pointer", transition: "transform 0.15s",
      position: "relative",
    }}
      onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.97)"}
      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
      onTouchStart={(e) => e.currentTarget.style.transform = "scale(0.97)"}
      onTouchEnd={(e) => e.currentTarget.style.transform = "scale(1)"}
    >
      <div style={{ height: 90, position: "relative", overflow: "hidden" }}>
        <img
          src={(recipe.thumbnail_url || CATEGORY_IMG[recipe.category] || CATEGORY_IMG['한식']) + '?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop'}
          alt={recipe.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: locked ? "blur(3px)" : "none" }}
          onError={(e) => { e.target.style.display = "none"; e.target.parentNode.style.background = "linear-gradient(135deg, #FF6B35, #FF9A5C)"; }}
        />
        {locked && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(0,0,0,0.3)", fontSize: 22 }}>
            🔒
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>{recipe.title}</p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: DIFFICULTY_COLOR[recipe.difficulty], fontWeight: 600 }}>
            {recipe.difficulty}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>· ⏱{recipe.cooking_time}분</span>
          {recipe.is_premium && <span style={{ fontSize: 10, color: "#FF9800" }}>✨</span>}
        </div>
      </div>
    </div>
  );
}

function QuickCard({ recipe, onClick }) {
  return (
    <div onClick={onClick} style={{
      minWidth: 130, background: "var(--surface)", borderRadius: 14, overflow: "hidden",
      boxShadow: "var(--shadow)", cursor: "pointer", flexShrink: 0,
    }}>
      <div style={{ height: 72, position: "relative", overflow: "hidden" }}>
        <img
          src={(recipe.thumbnail_url || CATEGORY_IMG[recipe.category] || CATEGORY_IMG['한식']) + '?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop'}
          alt={recipe.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.style.display = "none"; e.target.parentNode.style.background = "linear-gradient(135deg, #FF6B35, #FF9A5C)"; }}
        />
      </div>
      <div style={{ padding: "8px 10px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{recipe.title}</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>⏱ {recipe.cooking_time}분</p>
      </div>
    </div>
  );
}

function Section({ title, onMore, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>{title}</h2>
        <button onClick={onMore} style={{ background: "none", color: "var(--text-muted)", fontSize: 13 }}>
          전체보기 →
        </button>
      </div>
      {children}
    </div>
  );
}

function HorizontalScroll({ children }) {
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
      {children}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "16px",
      marginBottom: 12, boxShadow: "var(--shadow)" }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{ background: `${color}20`, color, borderRadius: 6, padding: "3px 8px",
      fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  );
}
