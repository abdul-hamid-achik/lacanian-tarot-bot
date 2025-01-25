import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ChatInterface } from '@/components/chat/chat-interface';

export default async function ChatPage() {
    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }

    return (
        <div className="container mx-auto flex h-[calc(100vh-4rem)] flex-col gap-4 p-4">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Lacanian Tarot Reading</h1>
                <p className="text-muted-foreground">
                    Ask for a tarot reading or chat about your journey
                </p>
            </div>
            <ChatInterface userId={session.user.id!} />
        </div>
    );
}
