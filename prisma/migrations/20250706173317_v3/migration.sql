/*
  Warnings:

  - You are about to drop the column `language` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `contextUsed` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `disliked` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `liked` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `memoryStored` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `originalContent` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `regenerated` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `accountNumber` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `autoReadMessages` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `bankBranch` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `customerType` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerificationToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `kycStatus` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `resetPasswordExpires` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `resetPasswordToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `voiceEnabled` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `api_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `banking_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `blog_posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `context_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `memories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `retrieval_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `search_results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vector_documents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "banking_profiles" DROP CONSTRAINT "banking_profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "context_entries" DROP CONSTRAINT "context_entries_userId_fkey";

-- DropForeignKey
ALTER TABLE "memories" DROP CONSTRAINT "memories_userId_fkey";

-- DropForeignKey
ALTER TABLE "retrieval_analytics" DROP CONSTRAINT "retrieval_analytics_userId_fkey";

-- DropForeignKey
ALTER TABLE "search_results" DROP CONSTRAINT "search_results_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_bankingProfileId_fkey";

-- AlterTable
ALTER TABLE "chat_sessions" DROP COLUMN "language",
DROP COLUMN "summary";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "contextUsed",
DROP COLUMN "disliked",
DROP COLUMN "language",
DROP COLUMN "liked",
DROP COLUMN "memoryStored",
DROP COLUMN "originalContent",
DROP COLUMN "regenerated";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "accountNumber",
DROP COLUMN "autoReadMessages",
DROP COLUMN "bankBranch",
DROP COLUMN "customerType",
DROP COLUMN "emailVerificationToken",
DROP COLUMN "kycStatus",
DROP COLUMN "resetPasswordExpires",
DROP COLUMN "resetPasswordToken",
DROP COLUMN "theme",
DROP COLUMN "voiceEnabled";

-- DropTable
DROP TABLE "api_keys";

-- DropTable
DROP TABLE "banking_profiles";

-- DropTable
DROP TABLE "blog_posts";

-- DropTable
DROP TABLE "context_entries";

-- DropTable
DROP TABLE "memories";

-- DropTable
DROP TABLE "retrieval_analytics";

-- DropTable
DROP TABLE "search_results";

-- DropTable
DROP TABLE "transactions";

-- DropTable
DROP TABLE "vector_documents";

-- DropEnum
DROP TYPE "TransactionType";
