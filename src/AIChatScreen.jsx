import { useState, useEffect, useRef } from "react";

export default function AIChatScreen({ onBack }) {
  const [msgs, setMsgs] = useState([
    { role: "ai", text: "안녕하세요! 🍳 냉장고 재료를 알려주시면 맛있는 혼밥 레시피를 추천해드릴게요!\n\n📷 사진으로 재료를 찍거나\n🎤 음성으로 말씀해주셔도 돼요!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const scrollRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  useEffect(() => {
    if (camOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [camOpen, stream]);

  async function sendMessage(text, imageBase64 = null) {
    if (!text.trim() && !imageBase64) return;
    const userMsg = { role: "user", text: imageBase64 ? `📷 ${text || "냉장고 사진 전송"}` : text };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const userContent = imageBase64
        ? [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: text || "이 냉장고 사진을 보고 재료를 파악해서 혼밥 레시피를 추천해줘. 한국어로 답해줘." }
          ]
        : text;

      const res = await fetch("/api/claude/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: "당신은 혼밥 전문 AI 셰프입니다. 사용자가 가진 재료로 만들 수 있는 간단하고 맛있는 혼밥 레시피를 추천해주세요. 항상 한국어로 답하고, 이모지를 활용해 친근하게 답변하세요. 조리 시간, 난이도, 간단한 조리법을 포함해주세요. 답변은 300자 이내로 간결하게 해주세요.",
          messages: [{ role: "user", content: userContent }],
        }),
      });

      const data = await res.json();
      const reply = data.content?.[0]?.text || "죄송해요, 다시 시도해주세요.";
      setMsgs(prev => [...prev, { role: "ai", text: reply }]);
    } catch (e) {
      console.error("AI 오류:", e);
      setMsgs(prev => [...prev, { role: "ai", text: "네트워크 오류가 발생했어요. 다시 시도해주세요." }]);
    }
    setLoading(false);
  }

  function toggleMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("이 브라우저는 음성 인식을 지원하지 않아요."); return; }
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const rec = new SpeechRecognition();
    rec.lang = "ko-KR";
    rec.interimResults = false;
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setRecording(false); };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }

  async function openCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(s);
      setCamOpen(true);
    } catch (e) { alert("카메라 권한이 필요해요."); }
  }

  function closeCamera() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCamOpen(false);
  }

  function capturePhoto() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    closeCamera();
    sendMessage("냉장고 재료를 보고 혼밥 레시피 추천해줘", base64);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg, #2D3A2E, #4A5E4A)", padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>✨ AI 냉파 추천</p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, margin: 0 }}>재료를 알려주면 레시피를 추천해드려요</p>
        </div>
        <span style={{ background: "#FF6B35", color: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>PRO</span>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            {m.role === "ai" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #2D3A2E, #4A5E4A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
            )}
            <div style={{
              maxWidth: "78%", padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.6,
              background: m.role === "ai" ? "var(--surface)" : "#FF6B35",
              color: m.role === "ai" ? "var(--text)" : "#fff",
              borderBottomLeftRadius: m.role === "ai" ? 4 : 16,
              borderBottomRightRadius: m.role === "user" ? 4 : 16,
              boxShadow: "var(--shadow)", whiteSpace: "pre-line",
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #2D3A2E, #4A5E4A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
            <div style={{ padding: "12px 16px", background: "var(--surface)", borderRadius: 16, borderBottomLeftRadius: 4, boxShadow: "var(--shadow)", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#888", display: "inline-block", animation: `bounce 1.2s ${d}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {camOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={closeCamera} style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>✕</button>
            <p style={{ color: "#fff", fontSize: 13, margin: 0 }}>냉장고 속 재료를 찍어주세요</p>
            <div style={{ width: 36 }} />
          </div>
          <video ref={videoRef} autoPlay playsInline style={{ flex: 1, objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
            <button onClick={capturePhoto} style={{ width: 70, height: 70, borderRadius: "50%", background: "#fff", border: "4px solid rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 28 }}>📸</button>
          </div>
        </div>
      )}

      <div style={{ padding: "12px 16px", background: "var(--surface)", borderTop: "1px solid var(--border)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        {recording && (
          <div style={{ textAlign: "center", padding: "6px 0 8px", color: "#FF6B35", fontSize: 13, fontWeight: 600 }}>
            🎤 듣고 있어요...
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button onClick={openCamera} style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--surface2)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "none", cursor: "pointer" }}>📷</button>
          <div style={{ flex: 1, background: "var(--surface2)", borderRadius: 22, padding: "10px 16px", display: "flex", alignItems: "center" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(input)}
              placeholder="재료를 입력하세요..."
              style={{ border: "none", background: "none", outline: "none", fontSize: 14, flex: 1, color: "var(--text)" }}
            />
          </div>
          <button onClick={toggleMic} style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: recording ? "#FF6B35" : "var(--surface2)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>🎤</button>
          {input.trim() && (
            <button onClick={() => sendMessage(input)} style={{ width: 42, height: 42, borderRadius: "50%", background: "#FF6B35", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "none", cursor: "pointer" }}>↑</button>
          )}
        </div>
      </div>
    </div>
  );
}
