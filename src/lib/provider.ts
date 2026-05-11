import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Thank you! We\\'ll get back to you soon.');
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <p className="text-xs uppercase tracking-widest font-medium text-stone-400 mb-3">Get in touch</p>
        <h2 className="text-5xl font-black text-stone-900 tracking-tight mb-12 leading-none">Let's talk.</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-stone-400 mb-3">Name</label>
              <input
                type="text" id="name" name="name" value={formData.name} onChange={handleChange} required
                className="w-full bg-transparent border-b border-stone-300 pb-3 text-stone-900 placeholder-stone-300 focus:outline-none focus:border-stone-900 transition-colors duration-200 text-sm"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-stone-400 mb-3">Email</label>
              <input
                type="email" id="email" name="email" value={formData.email} onChange={handleChange} required
                className="w-full bg-transparent border-b border-stone-300 pb-3 text-stone-900 placeholder-stone-300 focus:outline-none focus:border-stone-900 transition-colors duration-200 text-sm"
                placeholder="jane@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-400 mb-3">Message</label>
            <textarea
              id="message" name="message" value={formData.message} onChange={handleChange} required rows={4}
              className="w-full bg-transparent border-b border-stone-300 pb-3 text-stone-900 placeholder-stone-300 focus:outline-none focus:border-stone-900 transition-colors duration-200 resize-none text-sm"
              placeholder="Tell us about your project..."
            />
          </div>
          <div className="pt-2">
            <button type="submit" className="bg-stone-900 text-stone-100 px-8 py-4 text-xs font-medium tracking-widest uppercase hover:bg-stone-700 transition-colors duration-300">
              Send message →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  title = "Starter",
  price = "$12",
  period = "per month",
  description = "Everything you need to get started and grow.",
  features = ["Unlimited projects", "5GB storage", "Priority support", "Advanced analytics"],
  cta = "Get started"
}) => {
  return (
    <div className="bg-zinc-900 rounded-2xl p-10 ring-1 ring-white/10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-40 h-40 bg-amber-400/10 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <p className="text-xs uppercase tracking-widest font-medium text-amber-400 mb-6">{title}</p>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-6xl font-black text-white tracking-tight leading-none">{price}</span>
        <span className="text-zinc-400 text-sm mb-2">{period}</span>
      </div>
      <p className="text-zinc-400 text-sm leading-relaxed mb-8">{description}</p>
      <ul className="space-y-3 mb-10">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button className="w-full bg-amber-400 text-zinc-900 font-bold py-3.5 rounded-xl hover:bg-amber-300 transition-all duration-300 text-sm tracking-wide">
        {cta}
      </button>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest font-medium text-zinc-500 mb-8">Count</p>
        <div className="text-[9rem] font-black text-white leading-none tracking-tight mb-12 tabular-nums select-none">
          {count}
        </div>
        <div className="flex items-center gap-6 justify-center">
          <button
            onClick={() => setCount(c => c - 1)}
            className="w-14 h-14 rounded-full border border-zinc-700 text-zinc-400 text-2xl font-light hover:border-zinc-400 hover:text-white transition-all duration-200 active:scale-95"
          >
            −
          </button>
          <button
            onClick={() => setCount(0)}
            className="text-xs uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors duration-200 px-4"
          >
            Reset
          </button>
          <button
            onClick={() => setCount(c => c + 1)}
            className="w-14 h-14 rounded-full bg-white text-zinc-900 text-2xl font-light hover:bg-zinc-100 transition-all duration-200 active:scale-95"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "      <button type=\"submit\" className=\"bg-stone-900 text-stone-100 px-8 py-4 text-xs font-medium tracking-widest uppercase hover:bg-stone-700 transition-colors duration-300\">";
      case "card":
        return "      <button className=\"w-full bg-amber-400 text-zinc-900 font-bold py-3.5 rounded-xl hover:bg-amber-300 transition-all duration-300 text-sm tracking-wide\">";
      default:
        return "            className=\"w-14 h-14 rounded-full bg-white text-zinc-900 text-2xl font-light hover:bg-zinc-100 transition-all duration-200 active:scale-95\"";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "      <button type=\"submit\" className=\"bg-stone-900 text-stone-100 px-8 py-4 text-xs font-medium tracking-widest uppercase hover:bg-stone-700 active:scale-95 transition-all duration-300\">";
      case "card":
        return "      <button className=\"w-full bg-amber-400 text-zinc-900 font-bold py-3.5 rounded-xl hover:bg-amber-300 hover:scale-[1.02] transition-all duration-300 text-sm tracking-wide\">";
      default:
        return "            className=\"w-14 h-14 rounded-full bg-white text-zinc-900 text-2xl font-light hover:bg-zinc-100 hover:scale-110 transition-all duration-200 active:scale-95\"";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Card />
      </div>
    </div>
  );
}`;
    }

    if (componentName === "ContactForm") {
      return `import ContactForm from '@/components/ContactForm';

export default function App() {
  return <ContactForm />;
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return <${componentName} />;
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey || apiKey === "your-api-key-here") {
    console.log(
      "ANTHROPIC_API_KEY is not set (or is still the placeholder). " +
        "Using the mock provider — responses will be canned. " +
        "Set a real key in .env to generate components with Claude."
    );
    return new MockLanguageModel("mock-" + MODEL);
  }

  return anthropic(MODEL);
}
