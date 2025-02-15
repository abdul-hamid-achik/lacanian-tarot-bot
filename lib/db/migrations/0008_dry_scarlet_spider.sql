CREATE TABLE "anonymous_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anonymous_user_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "anonymous_user_theme" (
	"anonymous_user_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	"weight" numeric(3, 2) DEFAULT '0.5',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anonymous_user_theme_anonymous_user_id_theme_id_pk" PRIMARY KEY("anonymous_user_id","theme_id")
);
--> statement-breakpoint
CREATE TABLE "anonymous_vote" (
	"chat_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"is_upvoted" boolean NOT NULL,
	"anonymous_user_id" uuid NOT NULL,
	CONSTRAINT "anonymous_vote_chat_id_message_id_anonymous_user_id_pk" PRIMARY KEY("chat_id","message_id","anonymous_user_id")
);
--> statement-breakpoint
ALTER TABLE "chat" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "anonymous_user_id" uuid;--> statement-breakpoint
ALTER TABLE "anonymous_user_theme" ADD CONSTRAINT "anonymous_user_theme_anonymous_user_id_anonymous_user_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anonymous_user_theme" ADD CONSTRAINT "anonymous_user_theme_theme_id_theme_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."theme"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anonymous_vote" ADD CONSTRAINT "anonymous_vote_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anonymous_vote" ADD CONSTRAINT "anonymous_vote_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anonymous_vote" ADD CONSTRAINT "anonymous_vote_anonymous_user_id_anonymous_user_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_anonymous_user_id_anonymous_user_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_user"("id") ON DELETE no action ON UPDATE no action;