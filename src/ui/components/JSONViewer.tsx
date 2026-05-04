import React, { useEffect, useState } from 'react';
import { canvasStore } from '../../state/canvas.store';
import { ScrollArea } from '@/ui/shadcn/components/ui/scroll-area';

export const JSONViewer: React.FC = () => {
    const [json, setJson] = useState(() => JSON.stringify(canvasStore.getState(), null, 2));

    useEffect(() => {
        const unsub = canvasStore.subscribe((state) => {
            setJson(JSON.stringify(state, null, 2));
        });
        return unsub;
    }, []);

    return (
        <ScrollArea className="h-full w-full bg-slate-950/50">
            <div className="p-4 font-mono text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                {json}
            </div>
        </ScrollArea>
    );
};
