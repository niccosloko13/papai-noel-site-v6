(() => {
  const cleanAscii = (value, max) => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9 $%*+\-./:]/g, "")
    .trim().slice(0, max);

  const tlv = (id, value) => id + String(value.length).padStart(2, "0") + value;

  function crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function buildPixPayload({ key, receiverName, city, amount, txid }) {
    const pixKey = String(key || "").trim();
    if (!pixKey) throw new Error("Chave Pix não configurada.");
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw new Error("Valor Pix inválido.");

    const merchantAccount = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", pixKey);
    const safeName = cleanAscii(receiverName, 25) || "PAPAI NOEL";
    const safeCity = cleanAscii(city, 15) || "SAO PAULO";
    const safeTxid = cleanAscii(txid, 25).replace(/[^A-Z0-9]/g, "") || "***";
    const additional = tlv("05", safeTxid);

    let payload = "";
    payload += tlv("00", "01");
    payload += tlv("26", merchantAccount);
    payload += tlv("52", "0000");
    payload += tlv("53", "986");
    payload += tlv("54", value.toFixed(2));
    payload += tlv("58", "BR");
    payload += tlv("59", safeName);
    payload += tlv("60", safeCity);
    payload += tlv("62", additional);
    payload += "6304";
    return payload + crc16(payload);
  }

  function getPixConfig() {
    const base = window.STORE_DATA?.pix || {};
    const shipping = window.STORE_DATA?.shipping || {};
    return {
      enabled: false,
      discount: 15,
      key: "",
      receiverName: "",
      displayName: "",
      city: "SAO PAULO",
      shippingFlat: Number(shipping.flatRate || 0),
      ...base,
      ...JSON.parse(localStorage.getItem("natal_pix_config") || "{}")
    };
  }

  window.NatalPix = { buildPixPayload, getPixConfig, crc16 };
})();