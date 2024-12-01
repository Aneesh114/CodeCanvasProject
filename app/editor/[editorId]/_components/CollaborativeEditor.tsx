import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { EditorView } from "@codemirror/view";
import { Extension, EditorState } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { useCallback, useEffect, useState, useRef } from "react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom, useSelf, useStorage, useMutation } from "@liveblocks/react/suspense";
import { Room, LiveObject, LiveList } from "@liveblocks/client";
// import { Layer, LayerType } from "@/types/canvas";
import { ChatMessage, CompilationState} from "@/types/storage";
import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
} from "@codemirror/commands";
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap,
} from "@codemirror/language";
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from "@codemirror/autocomplete";
import styles from "./CollaborativeEditor.module.css";
import { Avatars } from "./Avatars";
import { Toolbar } from "./Toolbar";


interface UserInfo {
  name: string;
  picture?: string;
  color?: string;
}


interface CollaborativeEditorProps {
  documentId: string;
  defaultValue?: string;
 
}

interface CompilationStateStorage {
  output?: string;
  compiledBy?: string;
  timestamp?: number;
}

const handleImport = (editorView: EditorView | undefined | null) => {
  if (!editorView) return; // Safeguard for undefined or null
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".py";
  fileInput.onchange = (e) => {
    const target = e.target as HTMLInputElement;
    const file = target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: content },
        });
      };
      reader.readAsText(file);
    }
  };
  fileInput.click();
};

const handleExport = (editorView: EditorView | undefined | null) => {
  if (!editorView) return; // Safeguard for undefined or null
  const content = editorView.state.doc.toString();
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "code.py";
  link.click();
};



const basicSetup: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  autocompletion(),
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...closeBracketsKeymap,
    ...completionKeymap,
  ]),
];

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  // documentId,
  defaultValue,
}) => {
  const room = useRoom();
  const [element, setElement] = useState<HTMLElement>();
  const [yUndoManager, setYUndoManager] = useState<Y.UndoManager>();
  const editorViewRef = useRef<EditorView>();
  const [isCompiling, setIsCompiling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [chatMessage, setChatMessage] = useState("");

  const userInfo = useSelf((me) => me.info) as UserInfo;
  
  const compilationState = useStorage((root) => root.compilationState);
  const messages = useStorage((root) => root.messages);
  
  const initializeStorage = useMutation(({ storage }) => {
    // Initialize compilation state
    const existing = storage.get('compilationState');
    if (!existing) {
      storage.set('compilationState', new LiveObject<CompilationState>({
        output: '',
        compiledBy: '',
        timestamp: Date.now()
      }));
    }
    
    // Initialize messages if they don't exist
    const existingMessages = storage.get('messages');
    if (!existingMessages) {
      storage.set('messages', new LiveList<ChatMessage>([]));
    }
  }, []);

  const updateCompilationState = useMutation(({ storage }, newState: Partial<CompilationState>) => {
    // storage.set('compilationState', new LiveObject<CompilationState>({
    //   output: (storage.get('compilationState') as any)?.output ?? '',
    //   compiledBy: (storage.get('compilationState') as any)?.compiledBy ?? '',
    //   timestamp: (storage.get('compilationState') as any)?.timestamp ?? Date.now(),
    //   ...newState
    // }));
    storage.set('compilationState', new LiveObject<CompilationState>({
      output: (storage.get('compilationState') as CompilationStateStorage)?.output ?? '',
      compiledBy: (storage.get('compilationState') as CompilationStateStorage)?.compiledBy ?? '',
      timestamp: (storage.get('compilationState') as CompilationStateStorage)?.timestamp ?? Date.now(),
      ...newState
    }));

  }, []);

  const sendMessage = useMutation(({ storage }, text: string) => {
    try {
      const messagesList = storage.get('messages');
      if (messagesList && messagesList.push) {
        messagesList.push({
          id: Date.now().toString(),
          text,
          sender: userInfo.name,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [userInfo.name]);
  // }, [chatMessage, userInfo.name]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendMessage(chatMessage);
      setChatMessage("");
    }
  };

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    setElement(node);
  }, []);

  const handleCompile = async (retryAttempt = 0) => {
    if (!editorViewRef.current) return;
    
    const code = editorViewRef.current.state.doc.toString();
    if (!code.trim()) {
      updateCompilationState({
        output: "Error: No code to compile",
        compiledBy: userInfo.name,
        timestamp: Date.now()
      });
      return;
    }

    setIsCompiling(true);
    try {
      updateCompilationState({
        output: "Compiling...",
        compiledBy: userInfo.name,
        timestamp: Date.now()
      });

      // Use relative path for API endpoint
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/execute'
        : 'http://localhost:5000/execute';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: 'python'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      updateCompilationState({
        output: data.output || data.error || 'Unknown error occurred',
        compiledBy: userInfo.name,
        timestamp: Date.now()
      });

      setRetryCount(0);
      
    } catch (error) {
      console.error('Compilation error:', error);
      
      if (retryAttempt < MAX_RETRIES) {
        setRetryCount(retryAttempt + 1);
        setTimeout(() => handleCompile(retryAttempt + 1), RETRY_DELAY * (retryAttempt + 1));
        return;
      }

      updateCompilationState({
        output: `Error: Unable to compile code. Please try again. ${(error as Error).message}`,
        compiledBy: userInfo.name,
        timestamp: Date.now()
      });
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    if (!element || !room || !userInfo) return;

    let provider: LiveblocksYjsProvider;
    let ydoc: Y.Doc;

    try {
      initializeStorage();

      ydoc = new Y.Doc();
      provider = new LiveblocksYjsProvider(room as Room, ydoc);
      const ytext = ydoc.getText("codemirror");
      
      if (defaultValue && ytext.toString() === '') {
        ytext.insert(0, defaultValue);
      }
      
      const undoManager = new Y.UndoManager(ytext);
      setYUndoManager(undoManager);

      provider.awareness.setLocalStateField("user", {
        name: userInfo.name,
        color: userInfo.color || "#000000",
        colorLight: (userInfo.color || "#000000") + "80",
      });

      const state = EditorState.create({
        doc: ytext.toString(),
        extensions: [
          basicSetup,
          python(),
          yCollab(ytext, provider.awareness, { undoManager }),
        ],
      });

      const view = new EditorView({
        state,
        parent: element,
      });
      editorViewRef.current = view;

      return () => {
        view.destroy();
        provider?.destroy();
        ydoc?.destroy();
      };
    } catch (error) {
      console.error("Error initializing editor:", error);
    }
  }, [element, room, userInfo, defaultValue, initializeStorage]);

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <div className={styles.toolbar}>
          {/* {yUndoManager ? <Toolbar yUndoManager={yUndoManager} /> : null} */}
          {yUndoManager ? (
  <Toolbar
    yUndoManager={yUndoManager}
    handleImport={() => handleImport(editorViewRef.current)}
    handleExport={() => handleExport(editorViewRef.current)}
  />
) : null}

        </div>
        <Avatars />
      </div>
      <div className={styles.mainContent}>
        <div className={styles.editorSection}>
          <div className={styles.editorContainer} ref={ref}></div>
          <div className={styles.compileSection}>
            <button 
              onClick={() => handleCompile(0)}
              className={styles.compileButton}
              disabled={isCompiling}
            >
              {isCompiling ? `Running${retryCount > 0 ? ` (Retry ${retryCount}/${MAX_RETRIES})` : '...'}` : 'Run Python Code'}
            </button>
            <div className={styles.outputContainer}>
              <h3>Output:</h3>
              <pre className={styles.output}>
                {compilationState ? (
                  <>
                    {compilationState.output}
                    {compilationState.compiledBy && (
                      <div className={styles.compilationInfo}>
                        <span className={styles.compiler}>
                          Run by: {compilationState.compiledBy}
                        </span>
                        <span className={styles.timestamp}>
                          at {new Date(compilationState.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  'No output yet'
                )}
              </pre>
            </div>
          </div>
        </div>
        <div className={styles.chatSection}>
          <div className={styles.chatMessages}>
            {messages?.map((message: ChatMessage) => (
              <div 
                key={message.id} 
                className={`${styles.message} ${message.sender === userInfo.name ? styles.ownMessage : ''}`}
              >
                <div className={styles.messageHeader}>
                  <span className={styles.messageSender}>{message.sender}</span>
                  <span className={styles.messageTime}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className={styles.messageContent}>{message.text}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className={styles.chatForm}>
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              className={styles.chatInput}
            />
            <button type="submit" className={styles.sendButton}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};