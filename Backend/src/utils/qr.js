import QRCode from "qrcode";

export const makeQR = async (text) => {
  // returns a data URL (PNG) string
  return await QRCode.toDataURL(text, { errorCorrectionLevel: "M" });
};
