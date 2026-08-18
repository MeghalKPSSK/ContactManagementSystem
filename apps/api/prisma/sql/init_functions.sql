-- =============================================================================
-- MySQL Stored Functions for Primary Key Encryption and Decryption
-- Automatically managed with Prisma lifecycle
-- =============================================================================

DROP FUNCTION IF EXISTS `decryptId`;
DELIMITER //
CREATE FUNCTION `decryptId`(_in VARCHAR(32)) RETURNS varchar(32) CHARSET utf8mb3
DETERMINISTIC
NO SQL
BEGIN
  IF IFNULL(@zc_id_encrypt_decrypt_key,'')='' THEN
    RETURN aes_decrypt(UNHEX(_in), '9A48BCDA1014786E');
  ELSE
    RETURN aes_decrypt(UNHEX(_in), @ende_key);
  END IF;
END //
DELIMITER ;

DROP FUNCTION IF EXISTS `encryptId`;
DELIMITER //
CREATE FUNCTION `encryptId`(_in VARCHAR(32)) RETURNS varchar(32) CHARSET utf8mb3
DETERMINISTIC
NO SQL
BEGIN
  IF IFNULL(@zc_id_encrypt_decrypt_key,'')='' THEN
    RETURN HEX(aes_encrypt(_in, '9A48BCDA1014786E'));
  ELSE
    RETURN HEX(aes_encrypt(_in, @ende_key));
  END IF;
END //
DELIMITER ;
