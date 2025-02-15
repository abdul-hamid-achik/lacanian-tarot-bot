import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const TAROT_ERROR_CODES = {
    [StatusCodes.UNAUTHORIZED]: StatusCodes.UNAUTHORIZED,
    [StatusCodes.NOT_FOUND]: StatusCodes.NOT_FOUND,
    [StatusCodes.BAD_REQUEST]: StatusCodes.BAD_REQUEST,
    [StatusCodes.TOO_MANY_REQUESTS]: StatusCodes.TOO_MANY_REQUESTS,
    [StatusCodes.INTERNAL_SERVER_ERROR]: StatusCodes.INTERNAL_SERVER_ERROR,
    [StatusCodes.FORBIDDEN]: StatusCodes.FORBIDDEN,
    [StatusCodes.METHOD_NOT_ALLOWED]: StatusCodes.METHOD_NOT_ALLOWED,
} as const;

export const TarotErrorMessages: Record<keyof typeof TAROT_ERROR_CODES, string> = {
    [StatusCodes.UNAUTHORIZED]: "The cards sense a presence without proper attunement. Please authenticate your spiritual connection.",
    [StatusCodes.NOT_FOUND]: "The mists of time obscure this path. The cards you seek remain hidden from view.",
    [StatusCodes.BAD_REQUEST]: "The cards whisper of confusion. Your request needs clearer intention.",
    [StatusCodes.TOO_MANY_REQUESTS]: "The cards request patience. Too many readings in quick succession cloud their vision.",
    [StatusCodes.INTERNAL_SERVER_ERROR]: "The cosmic energies are temporarily misaligned. The cards request a moment to realign.",
    [StatusCodes.FORBIDDEN]: "The cards guard their secrets. This reading is meant for other eyes.",
    [StatusCodes.METHOD_NOT_ALLOWED]: "The cosmic forces do not recognize this form of communion.",
};

export const DatabaseErrorMessages = {
    USER_NOT_FOUND: "🔮 The mystical forces failed to locate your spiritual presence in our realm",
    USER_CREATE_FAILED: "🌙 The stars could not align to create your spiritual pathway",
    CHAT_SAVE_FAILED: "📜 The ethereal scrolls rejected your message",
    CHAT_DELETE_FAILED: "🕯️ The cosmic threads could not be unwoven from this conversation",
    CHAT_FETCH_FAILED: "🎴 Your past conversations are veiled in mysterious shadows",
    CHAT_BY_ID_FAILED: "🔮 The crystal ball could not focus on this conversation",
    MESSAGE_SAVE_FAILED: "📿 The spiritual messages could not be preserved in the astral plane",
    MESSAGE_FETCH_FAILED: "🌟 The cosmic whispers from this conversation are lost in the void",
    VOTE_SAVE_FAILED: "⭐ The celestial energies could not record your spiritual resonance",
    VOTE_FETCH_FAILED: "🌠 The cosmic alignments of this conversation remain unclear",
    DOCUMENT_SAVE_FAILED: "📚 The mystical grimoire rejected your sacred text",
    DOCUMENT_FETCH_FAILED: "📜 The ancient scrolls you seek are lost in the ethereal mists",
    DOCUMENT_BY_ID_FAILED: "📖 The book of wisdom you seek remains sealed by mystical forces",
    DOCUMENT_DELETE_FAILED: "🕯️ The sands of time refuse to release these mystical records",
    SUGGESTION_SAVE_FAILED: "🔮 The oracle could not transcribe these divine suggestions",
    SUGGESTION_FETCH_FAILED: "🎴 The cards are silent about these mystical suggestions",
    MESSAGE_BY_ID_FAILED: "📿 This spiritual message has vanished into the astral plane",
    MESSAGE_DELETE_FAILED: "🌙 The cosmic winds have swept away these messages into the void",
    CHAT_VISIBILITY_UPDATE_FAILED: "🌟 The veil between realms could not be adjusted as requested"
} as const;

export const TarotErrorSchema = z.object({
    code: z.nativeEnum(StatusCodes),
    message: z.string(),
    details: z.any().optional(),
});

export type TarotError = z.infer<typeof TarotErrorSchema>;

export const TarotResponseSchema = z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: TarotErrorSchema.optional(),
});

export type TarotResponse<T = any> = z.infer<typeof TarotResponseSchema> & {
    data?: T;
};

export function createTarotError(statusCode: keyof typeof TAROT_ERROR_CODES, customMessage?: string, details?: any): TarotError {
    return TarotErrorSchema.parse({
        code: statusCode,
        message: customMessage || TarotErrorMessages[statusCode] || "The cosmic forces are in disarray",
        details,
    });
}

export function createTarotResponse<T = any>(data?: T, error?: TarotError): TarotResponse<T> {
    return TarotResponseSchema.parse({
        success: !error,
        data,
        error,
    });
}

export class TarotAPIError extends Error {
    constructor(
        public readonly statusCode: keyof typeof TAROT_ERROR_CODES,
        message?: string,
        public readonly details?: any
    ) {
        super(message || TarotErrorMessages[statusCode]);
        this.name = 'TarotAPIError';
    }

    toResponse(): TarotResponse {
        return createTarotResponse(undefined, createTarotError(this.statusCode, this.message, this.details));
    }
}
