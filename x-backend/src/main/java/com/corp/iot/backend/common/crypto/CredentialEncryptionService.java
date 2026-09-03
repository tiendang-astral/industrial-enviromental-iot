package com.corp.iot.backend.common.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

// AES-256-GCM, key dùng chung toàn platform qua app.encryption.key (env APP_ENCRYPTION_KEY,
// base64 32 byte) — mã hoá credential external_source (xem DATABASE.md § external_source).
// IV 12 byte random mỗi lần encrypt, prepend vào ciphertext, base64 toàn bộ để lưu cột text.
@Component
public class CredentialEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int IV_LENGTH_BYTES = 12;

    private final SecretKeySpec keySpec;
    private final SecureRandom secureRandom = new SecureRandom();

    public CredentialEncryptionService(@Value("${app.encryption.key}") String base64Key) {
        this.keySpec = new SecretKeySpec(Base64.getDecoder().decode(base64Key), "AES");
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + ciphertext.length);
            buffer.put(iv).put(ciphertext);
            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt credential", e);
        }
    }

    // Đọc ngược credential đã lưu để mở kết nối tới database ngoài (thử kết nối, đọc cấu trúc
    // bảng, chạy thử). IV nằm ở 12 byte đầu, phần còn lại là ciphertext.
    public String decrypt(String encrypted) {
        try {
            byte[] raw = Base64.getDecoder().decode(encrypted);
            ByteBuffer buffer = ByteBuffer.wrap(raw);
            byte[] iv = new byte[IV_LENGTH_BYTES];
            buffer.get(iv);
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt credential", e);
        }
    }
}
