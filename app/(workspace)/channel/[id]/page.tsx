import { ChannelChat } from "@/components/shared/channel-chat";
import { ChatLayout } from "@/components/shared/chat-layout";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ChatLayout>
      <ChannelChat channelId={id} />
    </ChatLayout>
  );
}
