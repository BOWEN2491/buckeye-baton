"""Local-only Streamlit fallback rehearsal; no paid API calls."""
import streamlit as st

st.set_page_config(page_title="HackOHI/O fallback rehearsal", page_icon="🛠️")
st.title("Streamlit 备用环境练习")
st.caption("赛前通用练习，不调用 AI。")
with st.form("echo"):
    text = st.text_area("测试文字", "Hello from HackOHI/O!")
    submitted = st.form_submit_button("运行练习")
if submitted:
    if text.strip():
        st.success("Python 界面与逻辑运行正常")
        st.json({"result": text.strip(), "characters": len(text.strip())})
    else:
        st.warning("请输入文字。")
