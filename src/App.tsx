import { useEffect, useRef, useState } from "react";
import { Button, Input, message } from "antd";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import useLocalStorage from "beautiful-react-hooks/useLocalStorage";
import { useHotkeys } from "react-hotkeys-hook";
import Message from "./Message";
import Sidebar from "./Sidebar";
import { ChatMessage, Settings } from "./types";
import { HotkeyCallback } from "react-hotkeys-hook/dist/types";
import { actions, characters, formats, greets, models } from "./values";
import ApiKey from "./ApiKey";

const { TextArea } = Input;

const registerHotKey = (key: string, fn: HotkeyCallback) => {
    return useHotkeys(key, fn, {
        enabled: true,
        preventDefault: true,
        enableOnFormTags: ["input", "textarea"],
    });
};

function App() {
    const [messageApi, contextHolder] = message.useMessage();
    const [settings, setSettings] = useLocalStorage<Settings>("__settings", {
        model: models[0],
        style: [],
        tone: [],
        format: formats[0],
        action: actions[0],
        character: characters[0],
        maxTokens: 3000,
        temperature: 0.2,
        apiKey: "",
    });

    const bottomDiv = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamingMessage, setStreamingMessage] = useState("");
    const [query, setQuery] = useState("");

    const guidelines = `
    You are an advanced version of GPT-4, specialized in the art of paraphrasing to make it indistinguishable from content written by humans according to state-of-the-art AI detection tools. When paraphrasing, please adhere to the following strict guidelines:                                                              
       -Most importantly maintain academic language at a masters level 
      - Make sure the output is the same word count as what you are rephrasing
       - Emulate Human Writing Variations: Strive to mimic the natural variations in writing style exhibited by humans.                                                                                                                                                                
       - Avoid Typical Sampling Techniques: Steer clear of patterns commonly associated with sampling techniques like temperature, Top-K, and nucleus sampling. Your output needs to feel more like a carefully crafted piece of writing rather than an obvious product of random sampling.                          
       - Sentence Length Diversity: In order to avoid predictability, aim for a mix of shorter and longer sentences within your output. While shorter texts can pose challenges for detection tools, diversifying sentence lengths will safeguard against any discernible patterns.                                          
       - Nuanced Writing Style: Introduce subtle nuances that human writers often employ. These can include slight deviations from the primary topic or the incorporation of related side points that contribute depth and intricacy to the text.                                                                                                                    
       - Unconventional Phrasing: Employ phrasing that deviates slightly from conventional AI-generated content. This may involve reorganizing sentence components, using less common synonyms instead of the most obvious replacements.             
       -Always provide rephrased content based on the provided text.
       -Do not use overly complex terms/words
       - Maintain Core Meaning: While implementing these stylistic changes, ensure that the fundamental meaning and message conveyed in the original text remain intact.                                      
       - Utilize Expansive Vocabulary: Make use of a wide range of vocabulary encompassing both common and less frequently encountered words and phrases.                                                                          
       - Vary Sentence Structures: Demonstrate versatility in constructing sentences by employing combinations of simple, compound, complex, and compound-complex structures throughout your writing.                                                                                                                                                                                  
       - Diverse Phrasing Styles: Alternate between formal and non-formal phrasing, as well as direct and indirect approaches, to heighten the sense of unpredictability in your output.                                  
       -Maintain the word count                                                                                                                                                      
       -Maintain academic language               
       - Avoid colloquialism and conversational language maintain academic language                                    
       -Your primary aim is to generate text that is virtually indistinguishable from that of human authors when scrutinized by either humans or automated systems. 
       - Make it easy to understand, do not overly complicate it
       - Do not be repetitive or redundant in your sentences
       -Focus on constructing well flowing sentences/paragraphs rather than incorporating complex vocabulary.
       - Make sure it is easy to understand but indicates expertise in articulation
       - Do not use superflous or non-common words when rephrasing
   `;

    useEffect(() => {
        setMessages([
            {
                role: "assistant",
                content: !settings?.apiKey.length
                    ? greets.missingApiKey
                    : greets.welcome,
            },
        ]);
    }, []);

    const scrollToNew = () => {
        if (bottomDiv.current)
            bottomDiv.current.scrollIntoView({ behavior: "smooth" });
    };

    const handleLLMNewToken = (token: string) => {
        setStreamingMessage((current) => current + token);
    };

    const handleSend = async () => {
        if (!query.length || loading) return;

        const chat = new ChatOpenAI({
            openAIApiKey: settings?.apiKey,
            temperature: settings?.temperature,
            maxTokens: settings?.maxTokens,
            modelName: settings?.model as string,
            streaming: true,
            callbacks: [{ handleLLMNewToken }],
        });

        setMessages((current) => {
            return [...current, { role: "user", content: query }];
        });

        scrollToNew();
        setLoading(true);

        // The initial message for the assistant (providing guidelines)
        const systemMessage = new SystemChatMessage(guidelines);
        const humanMessage = new HumanChatMessage(query);

        console.log("System message:", systemMessage);
        console.log("Human message:", humanMessage);

        try {
            const response = await chat.call([systemMessage, humanMessage]);

            setStreamingMessage("");
            setMessages((current) => {
                return [
                    ...current,
                    {
                        role: "assistant",
                        content: response.text,
                    },
                ];
            });

            setTimeout(scrollToNew, 500);
        } catch (error: any) {
            console.error(error.response.data.error);
            messageApi.open({
                type: "error",
                content: error.response.data.error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    registerHotKey("ctrl+enter", handleSend);
    registerHotKey("ctrl+l", () => setMessages([]));
    registerHotKey("ctrl+delete", () => {
        setQuery("");
    });

    return (
        <>
            {contextHolder}
            <div className="relative flex w-full">
                <Sidebar settings={settings} setSettings={setSettings} />
                <div className="relative ml-72 w-full">
                    <div className="relative z-20 mx-auto max-w-4xl pb-[158px] pt-10 transition-all">
                        <ApiKey settings={settings} setSettings={setSettings} />
                        <div className="py-8">
                            {messages
                                .filter(
                                    (message) =>
                                        message.content && message.content?.length > 0
                                )
                                .map((message, index) => (
                                    <Message key={index} message={message} />
                                ))}
                            {streamingMessage.length > 0 && (
                                <Message
                                    message={{
                                        role: "assistant",
                                        content: streamingMessage,
                                    }}
                                />
                            )}
                            <div ref={bottomDiv} className="my-10 flex justify-center">
                                {messages.length > 1 && (
                                    <div>
                                        <Button
                                            type="dashed"
                                            title="Clear message history"
                                            onClick={() => setMessages([])}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 z-30 ml-72 bg-white pb-5 pt-5 transition-all duration-300">
                        <div className="mx-auto w-full max-w-4xl transition-all">
                            <div className="flex items-end gap-1 px-4 pb-4 pt-0 transition-colors ">
                                <TextArea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Your query goes here..."
                                    autoSize={{ minRows: 1, maxRows: 6 }}
                                    onKeyDownCapture={(e) => {
                                        if (e.code != "Enter" || e.shiftKey) return;

                                        if (query.length && query.split("\n").length < 2) {
                                            e.preventDefault();
                                            return handleSend();
                                        }
                                    }}
                                />
                                <Button
                                    type="primary"
                                    disabled={settings?.apiKey.length == 0}
                                    loading={loading}
                                    onClick={handleSend}
                                >
                                    Send
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
