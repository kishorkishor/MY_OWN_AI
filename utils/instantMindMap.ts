// Client-side instant mind map generator
// Parses AI response text directly to create mind map structure without API call

import { MindMapNode, Message } from '../types';

/**
 * Instantly generates a mind map from conversation text
 * No API call needed - parses structure from markdown/text patterns
 */
export const generateInstantMindMap = (messages: Message[]): MindMapNode => {
    const root: MindMapNode = {
        id: 'root-instant',
        name: 'Thought Space',
        type: 'root',
        weight: 10,
        children: []
    };

    if (messages.length === 0) return root;

    // Get the latest AI message for primary analysis
    const aiMessages = messages.filter(m => m.role === 'model');
    const userMessages = messages.filter(m => m.role === 'user');

    // Extract the main topic from user's first meaningful message
    const mainTopic = extractMainTopic(userMessages);
    if (mainTopic) {
        const topicNode: MindMapNode = {
            id: `topic-${Date.now()}`,
            name: mainTopic,
            type: 'topic',
            weight: 8,
            children: []
        };

        // Parse all AI messages for options, pros, cons
        aiMessages.forEach((msg, idx) => {
            const extracted = extractFromAIMessage(msg.text, idx);
            topicNode.children = [...(topicNode.children || []), ...extracted];
        });

        // Mark the first option as recommendation if exists
        const options = topicNode.children?.filter(c => c.type === 'option') || [];
        if (options.length > 0) {
            options[0].isRecommendation = true;
            options[0].weight = 10;
        }

        root.children = [topicNode];
    }

    return root;
};

/**
 * Extract main topic from user messages
 */
const extractMainTopic = (userMessages: Message[]): string => {
    if (userMessages.length === 0) return 'Decision';

    const firstMsg = userMessages[0].text;

    // Try to extract topic from common patterns
    const patterns = [
        /should i ([\w\s]+)\??/i,
        /help me (decide|choose|pick) (?:on |about )?([\w\s]+)/i,
        /choosing between ([\w\s]+)/i,
        /what ([\w\s]+) should/i,
        /best ([\w\s]+) for/i,
    ];

    for (const pattern of patterns) {
        const match = firstMsg.match(pattern);
        if (match) {
            const topic = (match[2] || match[1]).trim();
            // Capitalize first letter
            return topic.charAt(0).toUpperCase() + topic.slice(1);
        }
    }

    // Fallback: use first few words
    const words = firstMsg.split(/\s+/).slice(0, 4).join(' ');
    return words.length > 30 ? words.slice(0, 30) + '...' : words;
};

/**
 * Extract structured nodes from AI message text
 */
const extractFromAIMessage = (text: string, msgIndex: number): MindMapNode[] => {
    const nodes: MindMapNode[] = [];
    const timestamp = Date.now();

    // 1. Extract OPTIONS format: [OPTIONS: A | B | C]
    const optionsMatch = text.match(/\[OPTIONS:\s*([^\]]+)\]/gi);
    if (optionsMatch) {
        optionsMatch.forEach((match, i) => {
            const optionsStr = match.replace(/\[OPTIONS:\s*/i, '').replace(/\]$/, '');
            const choices = optionsStr.split('|').map(o => o.trim()).filter(o => o);

            choices.forEach((choice, j) => {
                nodes.push({
                    id: `option-${timestamp}-${i}-${j}`,
                    name: choice,
                    type: 'option',
                    weight: 7 - j, // First options get higher weight
                });
            });
        });
    }

    // 2. Extract bold headers with colons: **Something:**
    const boldHeaders = text.match(/\*\*([^*]+)\*\*:/g);
    if (boldHeaders) {
        boldHeaders.forEach((match, i) => {
            const label = match.replace(/\*\*/g, '').replace(/:$/, '').trim();
            if (label.length < 40 && !nodes.some(n => n.name === label)) {
                // Determine type based on keywords
                const lowerLabel = label.toLowerCase();
                let type: MindMapNode['type'] = 'option';
                if (lowerLabel.includes('pro') || lowerLabel.includes('advantage') || lowerLabel.includes('benefit')) {
                    type = 'pro';
                } else if (lowerLabel.includes('con') || lowerLabel.includes('disadvantage') || lowerLabel.includes('risk')) {
                    type = 'con';
                }

                nodes.push({
                    id: `bold-${timestamp}-${i}`,
                    name: label,
                    type,
                    weight: 6,
                });
            }
        });
    }

    // 3. Extract bullet list items that look like options (short, capitalized)
    const bulletPattern = /(?:^|\n)\s*[-*•]\s+([A-Z][^.\n]{2,40})(?:\n|$)/g;
    let bulletMatch;
    while ((bulletMatch = bulletPattern.exec(text)) !== null) {
        const item = bulletMatch[1].trim();
        const wordCount = item.split(/\s+/).length;

        // Only add if short (likely an option) and not already captured
        if (wordCount <= 5 && !nodes.some(n => n.name === item)) {
            nodes.push({
                id: `bullet-${timestamp}-${nodes.length}`,
                name: item,
                type: 'option',
                weight: 5,
            });
        }
    }

    // 4. Extract numbered items
    const numberedPattern = /(?:^|\n)\s*\d+\.\s+\*?\*?([A-Z][^.\n]{2,40})\*?\*?/g;
    let numMatch;
    while ((numMatch = numberedPattern.exec(text)) !== null) {
        const item = numMatch[1].replace(/\*\*/g, '').trim();
        const wordCount = item.split(/\s+/).length;

        if (wordCount <= 6 && !nodes.some(n => n.name === item)) {
            nodes.push({
                id: `num-${timestamp}-${nodes.length}`,
                name: item,
                type: 'option',
                weight: 6,
            });
        }
    }

    // 5. Look for recommendation patterns
    const recPattern = /(?:recommend|suggest|best option|my choice)[:\s]+\*?\*?([^.\n]+)/i;
    const recMatch = text.match(recPattern);
    if (recMatch) {
        const recName = recMatch[1].replace(/\*\*/g, '').trim().slice(0, 40);
        if (recName) {
            // Try to find existing node to mark as recommendation
            const existing = nodes.find(n =>
                n.name.toLowerCase().includes(recName.toLowerCase()) ||
                recName.toLowerCase().includes(n.name.toLowerCase())
            );
            if (existing) {
                existing.isRecommendation = true;
                existing.weight = 10;
            } else {
                nodes.push({
                    id: `rec-${timestamp}`,
                    name: recName,
                    type: 'option',
                    weight: 10,
                    isRecommendation: true,
                });
            }
        }
    }

    return nodes;
};

export default generateInstantMindMap;
