import streamlit as st
import uuid
import socket
from datetime import datetime
from utils import get_client, extract_text_from_file, save_chat_history, load_chat_history, get_all_chats, delete_chat, encode_image, get_system_tools, get_models

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

# Page Configuration
st.set_page_config(page_title="LM Studio Chat", page_icon="🤖", layout="wide")

# Initialize Session State
if "models_refreshed" not in st.session_state:
    st.session_state.pop("available_models", None)
    st.session_state.models_refreshed = True

if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "system", "content": "You are a helpful assistant."}]
if "chat_id" not in st.session_state:
    st.session_state.chat_id = str(uuid.uuid4())
if "chat_title" not in st.session_state:
    st.session_state.chat_title = "New Chat"
if "active_files" not in st.session_state:
    st.session_state.active_files = {} # Dict: filename -> content
if "active_images" not in st.session_state:
    st.session_state.active_images = {}

# Sidebar - History & Settings
with st.sidebar:
    # Custom CSS for smaller history items
    st.markdown("""
        <style>
        .stButton button {
            height: auto;
            padding-top: 5px;
            padding-bottom: 5px;
        }
        div[data-testid="stVerticalBlock"] > div[data-testid="stVerticalBlock"] button p {
            font-size: 0.85rem;
        }
        </style>
    """, unsafe_allow_html=True)

    # Chat Management (Top Priority)
    col_new, col_del = st.columns([0.8, 0.2])
    with col_new:
        if st.button("➕ New Chat", use_container_width=True):
            st.session_state.messages = [{"role": "system", "content": "You are a helpful assistant."}]
            st.session_state.chat_id = str(uuid.uuid4())
            st.session_state.active_files = {}
            st.session_state.active_images = {}
            st.rerun()
    
    st.divider()
    
    with st.expander("📜 History", expanded=False):
        saved_chats = get_all_chats()
        
        # Scrollable container for history if many chats
        with st.container(height=300):
            for chat in saved_chats:
                col1, col2 = st.columns([0.85, 0.15])
                with col1:
                    # Highlight current chat
                    type_ = "primary" if chat['id'] == st.session_state.chat_id else "secondary"
                    if st.button(chat['title'], key=f"load_{chat['id']}", use_container_width=True, type=type_):
                        loaded_chat = load_chat_history(chat['id'])
                        if loaded_chat:
                            st.session_state.messages = loaded_chat['messages']
                            st.session_state.chat_id = loaded_chat['id']
                            # Note: We don't persist file context in history yet, would need schema update
                            st.session_state.active_files = {} 
                            st.session_state.active_images = {}
                            st.rerun()
                with col2:
                    if st.button("✕", key=f"del_{chat['id']}", help="Delete chat"):
                        delete_chat(chat['id'])
                        if chat['id'] == st.session_state.chat_id:
                            st.session_state.messages = [{"role": "system", "content": "You are a helpful assistant."}]
                            st.session_state.chat_id = str(uuid.uuid4())
                            st.session_state.chat_title = "New Chat"
                        st.rerun()

    st.divider()

    # Settings (Collapsed)
    with st.expander("⚙️ Settings"):
        st.info(f"📱 **Mobile Access**\n\nhttp://{get_local_ip()}:8501")
        base_url = st.text_input("Base URL", value="http://localhost:1234/v1")
        
        # Model Selection with Fetch
        c_label, c_refresh = st.columns([0.8, 0.2])
        with c_label:
            st.caption("Model Selection")
        with c_refresh:
            if st.button("🔄", help="Refresh Model List", key="btn_refresh_models"):
                st.session_state.pop("available_models", None)
                st.rerun()
        
        if "available_models" not in st.session_state:
            st.session_state.available_models = get_models(base_url=base_url)
        
        available_models = st.session_state.available_models
        if not available_models:
                available_models = ["local-model"]
        
        # Try to keep current model if in list, else default to first
        current_model_index = 0
        if "current_model" in st.session_state and st.session_state.current_model in available_models:
                current_model_index = available_models.index(st.session_state.current_model)
                
        model = st.selectbox("Model", available_models, index=current_model_index, key="current_model", label_visibility="collapsed", help="Selecting a different model will attempt to auto-load it (requires 'Just-In-Time Loading' enabled in LM Studio).")
        
        st.caption("Model Parameters")
        temperature = st.slider("Temperature", 0.0, 1.0, 0.7)
        max_tokens = st.number_input("Max Tokens", min_value=100, max_value=32000, value=2000, step=100)
        
        st.caption("System Prompt")
        system_prompt = st.text_area("System Prompt", value="You are a helpful assistant.", height=100)
        
        history_limit = st.slider("History Limit (messages)", 2, 50, 10, help="Limit context to the last N messages for speed.")
        
        use_system_role = st.checkbox("Use 'System' Role", value=True, key="use_system_role_cb", help="Uncheck if model gives 'Only user and assistant roles supported' error.")
        
        enable_tools = st.checkbox("Enable Tools (Experimental)", value=False, key="enable_tools_cb", help="Allow the model to use tools. Warning: May cause blank responses if model attempts to use a tool without a return value.")


# Main Chat Interface
col_title, col_attach = st.columns([0.85, 0.15])
with col_title:
    st.title("LM Studio Client")

with col_attach:
    # Attachment Popover (Simulating "near input" access by being distinct)
    with st.popover("📎 Attach", use_container_width=True):
        st.markdown("### Add Context")
        uploaded_files = st.file_uploader("Upload files", type=["pdf", "docx", "txt", "md", "png", "jpg", "jpeg"], accept_multiple_files=True, label_visibility="collapsed")
        
        if uploaded_files:
            if st.button("Process Files", use_container_width=True):
                with st.spinner("Reading..."):
                    for file in uploaded_files:
                        file_ext = file.name.split('.')[-1].lower()
                        if file_ext in ['png', 'jpg', 'jpeg']:
                             if file.name not in st.session_state.active_images:
                                 st.session_state.active_images[file.name] = encode_image(file)
                        elif file.name not in st.session_state.active_files:
                            text = extract_text_from_file(file)
                            st.session_state.active_files[file.name] = text
                    st.success("Added!")
                    st.rerun()

# Display Active Context Files
if st.session_state.active_files or st.session_state.active_images:
    with st.expander(f"📚 Active Context ({len(st.session_state.active_files) + len(st.session_state.active_images)} items)", expanded=False):
        # Text Files
        for filename, content in list(st.session_state.active_files.items()):
            c1, c2 = st.columns([0.9, 0.1])
            with c1:
                st.caption(f"📄 {filename} ({len(content)} chars)")
            with c2:
                if st.button("✕", key=f"rm_{filename}"):
                    del st.session_state.active_files[filename]
                    st.rerun()
        # Images
        for filename, b64_str in list(st.session_state.active_images.items()):
            c1, c2 = st.columns([0.9, 0.1])
            with c1:
                st.caption(f"🖼️ {filename}")
                st.image(f"data:image/jpeg;base64,{b64_str}", width=100)
            with c2:
                if st.button("✕", key=f"rm_img_{filename}"):
                    del st.session_state.active_images[filename]
                    st.rerun()
            # Optional: Preview content
            # st.text(content[:200] + "...")

# Display Messages

# Display Messages
for message in st.session_state.messages:
    if message["role"] != "system":
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

# Chat Input
if prompt := st.chat_input("What would you like to know?"):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Prepare messages for API (Optimized Context Window)
    # 1. Base System Message
    system_content = system_prompt
    
    # 2. Add File Context if exists
    if st.session_state.active_files:
        context_str = "\n\n".join([f"--- File: {name} ---\n{content}" for name, content in st.session_state.active_files.items()])
        system_content += f"\n\nContext from attached files:\n{context_str}"
    
    # 3. Build History (System + Last N messages)
    # Filter out existing system messages from history to avoid duplication/confusion
    conversation_history = [m for m in st.session_state.messages if m["role"] != "system"]
    
    # Slice to keep only the last 'history_limit' messages
    # We ensure we include the latest user prompt which was just appended
    recent_history = conversation_history[-history_limit:]
    
    # 4. Handle Images (Multimodal User Message)
    # If there are active images, we attach them to the LATEST user message (which is 'prompt')
    if st.session_state.active_images and recent_history and recent_history[-1]["role"] == "user":
        last_msg = recent_history[-1]
        # Check if content is already a list (to avoid double wrapping if rerun happens)
        if isinstance(last_msg["content"], str):
            content_blocks = [{"type": "text", "text": last_msg["content"]}]
            
            for filename, b64_str in st.session_state.active_images.items():
                content_blocks.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{b64_str}"
                    }
                })
            
            # Replace the content string with the list of blocks
            # Note: We Modify a copy to not corrupt session state history with huge base64 strings permanently if we don't want to
            # But for simplicity, let's modify the payload copy 'recent_history' elements
            # Actually recent_history is a slice of references, so modifying it modifies session state. 
            # Storing base64 in session state history is heavy but necessary for history persistence.
            # However, standard OpenAI history usually expects text. 
            # Let's create a deep copy for the API call to avoid breaking the UI string display if possible?
            # Streamlit displays markdown string. If we change it to list, st.markdown might break.
            # Let's handle this carefully:
            # We will NOT modify st.session_state.messages. We will modify the 'api_messages' payload only.
            
            # Create a copy of the last message for the API payload
            api_last_msg = last_msg.copy()
            api_last_msg["content"] = content_blocks
            recent_history[-1] = api_last_msg

    # Construct final API payload
    if use_system_role:
        api_messages = [{"role": "system", "content": system_content}] + recent_history
    else:
        # Compatibility Mode: Merge system prompt into first user message
        if recent_history:
            # Copy list to avoid mutating references
            api_messages = list(recent_history)
            # Copy first message to avoid mutating session state
            first_msg = api_messages[0].copy()
            
            if first_msg["role"] == "user":
                if isinstance(first_msg["content"], str):
                    first_msg["content"] = f"{system_content}\n\n{first_msg['content']}"
                elif isinstance(first_msg["content"], list):
                    # Multimodal: Insert text block at start
                    first_msg["content"] = [{"type": "text", "text": f"{system_content}\n\n"}] + first_msg["content"]
                api_messages[0] = first_msg
            else:
                # First message is assistant? Prepend system as user message
                api_messages.insert(0, {"role": "user", "content": system_content})
        else:
             api_messages = [{"role": "user", "content": system_content}]

    # Generate Response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        # Stop Button Placeholder
        stop_placeholder = st.empty()
        
        try:
            # Check for Stop Button (Rendered before heavy work)
            if stop_placeholder.button("⏹ Stop Generating", key="stop_gen"):
                 # This block might not be reached if the click triggers an immediate rerun,
                 # but it serves as the UI element.
                 pass

            client = get_client(base_url=base_url)
            
            # Prepare arguments
            api_kwargs = {
                "model": model,
                "messages": api_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            }
            
            if enable_tools:
                api_kwargs["tools"] = get_system_tools()
            
            stream = client.chat.completions.create(**api_kwargs)
            
            # Initialize empty message in session state to capture partials
            st.session_state.messages.append({"role": "assistant", "content": ""})
            
            # Streaming with batch updates for UI performance
            chunk_count = 0
            for chunk in stream:
                # Check for content
                content = chunk.choices[0].delta.content
                if content:
                    full_response += content
                    chunk_count += 1
                    # Update UI every 5 chunks to reduce rendering overhead
                    if chunk_count % 5 == 0:
                        message_placeholder.markdown(full_response + "▌")
                        # Update session state continuously for crash/stop recovery
                        st.session_state.messages[-1]["content"] = full_response
                
                # Check for tool calls (if enabled)
                if enable_tools and chunk.choices[0].delta.tool_calls:
                    # For now, just notify that a tool was called (simplistic handling)
                    if not full_response:
                        full_response = "*(Model attempted to call a tool)*"
                        message_placeholder.markdown(full_response)
                        st.session_state.messages[-1]["content"] = full_response
            
            if not full_response:
                 full_response = "*(No response received from model. Check if 'Enable Tools' is causing this or if the model is compatible.)*"
                 st.session_state.messages[-1]["content"] = full_response

            # Final update
            message_placeholder.markdown(full_response)
            
            # Clear stop button
            stop_placeholder.empty()
            
            # Generate title if needed (after first exchange)
            if st.session_state.chat_title == "New Chat":
                 # Find the first user message
                 user_msgs = [m["content"] for m in st.session_state.messages if m["role"] == "user"]
                 if user_msgs:
                     first_msg = user_msgs[0]
                     # If it's a list (multimodal), get text
                     if isinstance(first_msg, list):
                         for block in first_msg:
                             if block.get("type") == "text":
                                 first_msg = block.get("text", "")
                                 break
                     
                     if isinstance(first_msg, str):
                         new_title = first_msg[:30] + "..." if len(first_msg) > 30 else first_msg
                         st.session_state.chat_title = new_title

            # Save chat history
            save_chat_history(st.session_state.chat_id, st.session_state.messages, title=st.session_state.chat_title)
            
            # Rerun to show the Copy button for this new message
            st.rerun()
            
        except Exception as e:
            # If we appended a message but failed, we might want to keep the partial or alert
            if st.session_state.messages and st.session_state.messages[-1]["role"] == "assistant" and not st.session_state.messages[-1]["content"]:
                 st.session_state.messages.pop() # Remove empty message if total failure
            st.error(f"Error communicating with LM Studio: {e}")