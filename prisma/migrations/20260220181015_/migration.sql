-- CreateTable
CREATE TABLE "mood_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "mood" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "note" TEXT,
    "coins_earned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mood_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mood_entries_user_id_idx" ON "mood_entries"("user_id");

-- CreateIndex
CREATE INDEX "mood_entries_created_at_idx" ON "mood_entries"("created_at");

-- AddForeignKey
ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
