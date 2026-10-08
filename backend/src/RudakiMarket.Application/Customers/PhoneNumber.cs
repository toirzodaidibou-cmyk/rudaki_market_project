namespace RudakiMarket.Application.Customers;

/// <summary>Рақамҳои мобилии Тоҷикистон: +992 ва 9 рақам.</summary>
public static class PhoneNumber
{
    /// <summary>"92 123 45 67", "+992 92 123-45-67", "992921234567" → "+992921234567".</summary>
    public static bool TryNormalize(string? input, out string e164)
    {
        e164 = "";
        var digits = new string((input ?? "").Where(char.IsAsciiDigit).ToArray());
        if (digits.Length == 12 && digits.StartsWith("992")) digits = digits[3..];
        if (digits.Length != 9) return false;
        e164 = "+992" + digits;
        return true;
    }
}
