import { StatusCodes } from 'http-status-codes';

export const TarotErrors = {
    [StatusCodes.UNAUTHORIZED]: {
        message: "The cards sense a presence without proper attunement. Please authenticate your spiritual connection.",
        code: StatusCodes.UNAUTHORIZED
    },
    [StatusCodes.NOT_FOUND]: {
        message: "The mists of time obscure this path. The cards you seek remain hidden from view.",
        code: StatusCodes.NOT_FOUND
    },
    [StatusCodes.BAD_REQUEST]: {
        message: "The cards whisper of confusion. Your request needs clearer intention.",
        code: StatusCodes.BAD_REQUEST
    },
    [StatusCodes.TOO_MANY_REQUESTS]: {
        message: "The cards request patience. Too many readings in quick succession cloud their vision.",
        code: StatusCodes.TOO_MANY_REQUESTS
    },
    [StatusCodes.INTERNAL_SERVER_ERROR]: {
        message: "The cosmic energies are temporarily misaligned. The cards request a moment to realign.",
        code: StatusCodes.INTERNAL_SERVER_ERROR
    },
    [StatusCodes.FORBIDDEN]: {
        message: "The cards guard their secrets. This reading is meant for other eyes.",
        code: StatusCodes.FORBIDDEN
    }
};

export const DatabaseErrors = {
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
};

export function createTarotError(statusCode: StatusCodes, customMessage?: string) {
    const error = TarotErrors[statusCode as keyof typeof TarotErrors];
    return {
        error: customMessage || error.message,
        code: error.code
    };
}
