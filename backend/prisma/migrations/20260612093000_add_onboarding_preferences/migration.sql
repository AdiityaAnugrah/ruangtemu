-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `activity` VARCHAR(191) NULL,
  ADD COLUMN `industry` VARCHAR(191) NULL,
  ADD COLUMN `socialComfort` INTEGER NULL,
  ADD COLUMN `leisureTopics` JSON NULL,
  ADD COLUMN `conversationTopics` JSON NULL,
  ADD COLUMN `smokes` BOOLEAN NULL,
  ADD COLUMN `drinksAlcohol` BOOLEAN NULL,
  ADD COLUMN `dietaryNotes` TEXT NULL;
