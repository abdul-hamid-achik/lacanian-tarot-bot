import type { Message } from 'ai';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';
import { useState, memo } from 'react';

import type { Vote } from '@/lib/db/schema';
import { getMessageIdFromAnnotations } from '@/lib/utils';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import equal from 'fast-deep-equal';

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isVoting, setIsVoting] = useState(false);

  if (isLoading) return null;
  if (message.role === 'user') return null;
  if (message.toolInvocations && message.toolInvocations.length > 0)
    return null;

  const handleVote = async (type: 'up' | 'down') => {
    if (isVoting) return;

    const messageId = getMessageIdFromAnnotations(message);
    if (!messageId) return;

    setIsVoting(true);

    try {
      // Optimistically update the UI
      mutate(
        `/api/vote?chatId=${chatId}`,
        async (currentVotes: Array<Vote> | undefined) => {
          if (!currentVotes?.length) {
            return [{
              chatId,
              messageId,
              userId: '', // Will be set by the server
              isUpvoted: type === 'up'
            }];
          }

          const votesWithoutCurrent = currentVotes.filter(
            (v) => v.messageId !== messageId
          );

          return [
            ...votesWithoutCurrent,
            {
              chatId,
              messageId,
              userId: currentVotes[0].userId,
              isUpvoted: type === 'up'
            }
          ];
        },
        {
          revalidate: false,
          optimisticData: (currentVotes: Array<Vote> | undefined) => {
            if (!currentVotes?.length) {
              return [{
                chatId,
                messageId,
                userId: '', // Will be set by the server
                isUpvoted: type === 'up'
              }];
            }

            const votesWithoutCurrent = currentVotes.filter(
              (v) => v.messageId !== messageId
            );

            return [
              ...votesWithoutCurrent,
              {
                chatId,
                messageId,
                userId: currentVotes[0].userId,
                isUpvoted: type === 'up'
              }
            ];
          }
        }
      );

      // Make the API call
      await fetch('/api/vote', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          messageId,
          type,
        }),
      });

      toast.success(type === 'up' ? 'Upvoted response!' : 'Downvoted response!');
    } catch (error) {
      // Revert the optimistic update on error
      mutate(`/api/vote?chatId=${chatId}`);
      toast.error('Failed to submit vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={async () => {
                await copyToClipboard(message.content as string);
                toast.success('Copied to clipboard!');
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              disabled={vote?.isUpvoted || isVoting}
              variant="outline"
              onClick={() => handleVote('up')}
            >
              <ThumbUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              variant="outline"
              disabled={(vote && !vote.isUpvoted) || isVoting}
              onClick={() => handleVote('down')}
            >
              <ThumbDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote Response</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
