import CryptoJS from "crypto-js";

const passEncrypt = () => "Gk-P@ss";

const hasJsonStructure = (value: string) => {
  if (!value) return false;
  try {
    const parsed = JSON.parse(value);
    return (
      Object.prototype.toString.call(parsed) === "[object Object]" ||
      Array.isArray(parsed)
    );
  } catch (error) {
    return false;
  }
};

const tryParse = (value: string) => {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const encryptSession = (key: string, data: unknown) => {
  const payload =
    typeof data === "string" || typeof data === "number"
      ? String(data)
      : JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(payload, passEncrypt()).toString();
  localStorage.setItem(key, encrypted);
};

const decryptSession = (key: string) => {
  const raw = localStorage.getItem(key);
  if (!raw) return raw;

  try {
    const bytes = CryptoJS.AES.decrypt(raw, passEncrypt());
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      return tryParse(raw);
    }

    if (hasJsonStructure(decrypted)) {
      return JSON.parse(decrypted);
    }

    return decrypted;
  } catch (error) {
    return tryParse(raw);
  }
};

export { encryptSession, decryptSession };
