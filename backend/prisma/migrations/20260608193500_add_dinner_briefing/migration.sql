-- AlterTable
ALTER TABLE `dinners`
  ADD COLUMN `arrivalTime` VARCHAR(191) NULL,
  ADD COLUMN `reservationName` VARCHAR(191) NULL,
  ADD COLUMN `hostName` VARCHAR(191) NULL,
  ADD COLUMN `hostPhone` VARCHAR(191) NULL,
  ADD COLUMN `venueNotes` TEXT NULL;

-- AlterTable
ALTER TABLE `dinner_tables`
  ADD COLUMN `venueTableLabel` VARCHAR(191) NULL;
