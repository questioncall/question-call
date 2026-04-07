import { ChannelChat } from "@/components/shared/channel-chat";
import { ChatLayout } from "@/components/shared/chat-layout";

const channelDirectory: Record<string, { title: string; counterpart: string; requiredAnswer: string }> = {
  chn_101: {
    title: "Why does current split in a parallel circuit?",
    counterpart: "Rohit Sir",
    requiredAnswer: "ONE",
  },
  chn_214: {
    title: "Need a faster way to complete the square",
    counterpart: "Meera Tutor",
    requiredAnswer: "TWO",
  },
  chn_315: {
    title: "Video help for balancing redox reactions",
    counterpart: "Anjana Koirala",
    requiredAnswer: "THREE",
  },
};

const sampleMessages = [
  {
    sender: "You",
    text: "I know the formula for current split, but I want the intuition in plain language.",
    isOwn: true,
  },
  {
    sender: "Teacher",
    text: "Imagine charge choosing between roads. Lower resistance is the wider road, so more current moves there in the same time.",
    isOwn: false,
  },
  {
    sender: "You",
    text: "That makes sense. Could you also relate it to voltage staying the same across each branch?",
    isOwn: true,
  },
  {
    sender: "Teacher",
    text: "Yes. Because each branch sees the same voltage, current only changes according to how hard each path resists that shared push.",
    isOwn: false,
  },
];

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const channel = channelDirectory[id] ?? {
    title: `Channel ${id}`,
    counterpart: "Shared thread",
    requiredAnswer: "UNSET",
  };

  return (
    <ChatLayout>
      <ChannelChat 
        channelId={id}
        title={channel.title}
        counterpart={channel.counterpart}
        requiredAnswer={channel.requiredAnswer}
        initialMessages={sampleMessages}
      />
    </ChatLayout>
  );
}
