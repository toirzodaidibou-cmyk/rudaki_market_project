using ClosedXML.Excel;
using RudakiMarket.Application.Prices;

namespace RudakiMarket.Infrastructure.Prices;

/// <summary>
/// Ҷадвали нархҳо дар Excel (.xlsx). Сутунҳои зард — барои иваз кардан (Нарх, Нархи кӯҳна, Фаъол);
/// боқимонда — маълумот. Ҳангоми хондан сутунҳо аз рӯи сарлавҳа ёфта мешаванд (тартибашон муҳим нест).
/// </summary>
public sealed class ClosedXmlPriceSheet : IPriceSheet
{
    private const string HId = "ID";
    private const string HCategory = "Категория";
    private const string HName = "Ном";
    private const string HSize = "Андоза";
    private const string HPrice = "Нарх";
    private const string HOldPrice = "Нархи кӯҳна (аксия)";
    private const string HActive = "Фаъол (ҳа/не)";

    public byte[] Write(IReadOnlyList<PriceRow> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Нархҳо");
        string[] headers = [HId, HCategory, HName, HSize, HPrice, HOldPrice, HActive];
        for (var c = 0; c < headers.Length; c++) ws.Cell(1, c + 1).Value = headers[c];

        var r = 2;
        foreach (var row in rows)
        {
            ws.Cell(r, 1).Value = row.Id;
            ws.Cell(r, 2).Value = row.Category;
            ws.Cell(r, 3).Value = row.Name;
            ws.Cell(r, 4).Value = row.SizeLabel ?? "";
            ws.Cell(r, 5).Value = row.Price;
            if (row.OldPrice is { } old) ws.Cell(r, 6).Value = old;
            ws.Cell(r, 7).Value = row.IsActive ? "ҳа" : "не";
            r++;
        }

        var header = ws.Range(1, 1, 1, headers.Length);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1d1a2b");
        header.Style.Font.FontColor = XLColor.White;
        // Сутунҳое, ки иваз мешаванд — зард
        if (rows.Count > 0)
        {
            var editable = ws.Range(2, 5, rows.Count + 1, 7);
            editable.Style.Fill.BackgroundColor = XLColor.FromHtml("#fff4cc");
            ws.Range(2, 5, rows.Count + 1, 6).Style.NumberFormat.Format = "0.00";
        }
        ws.SheetView.FreezeRows(1);
        ws.Range(1, 1, Math.Max(1, rows.Count) + 1, headers.Length).SetAutoFilter();
        ws.Column(1).Width = 8;
        ws.Column(2).Width = 22;
        ws.Column(3).Width = 60;
        ws.Column(4).Width = 10;
        ws.Column(5).Width = 12;
        ws.Column(6).Width = 20;
        ws.Column(7).Width = 14;

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public IReadOnlyList<PriceInputRow>? Read(Stream file)
    {
        XLWorkbook wb;
        try
        {
            wb = new XLWorkbook(file);
        }
        catch
        {
            return null; // .xlsx нест ё вайрон
        }
        using (wb)
        {
            var ws = wb.Worksheets.FirstOrDefault();
            if (ws is null) return null;
            var headerRow = ws.Row(1);
            int Col(string name) =>
                headerRow.CellsUsed().FirstOrDefault(c => string.Equals(c.GetString().Trim(), name, StringComparison.OrdinalIgnoreCase))?.Address.ColumnNumber ?? -1;
            int cId = Col(HId), cPrice = Col(HPrice), cOld = Col(HOldPrice), cActive = Col(HActive);
            if (cId < 0 || cPrice < 0) return null;

            var result = new List<PriceInputRow>();
            var last = ws.LastRowUsed()?.RowNumber() ?? 1;
            for (var r = 2; r <= last; r++)
            {
                var row = ws.Row(r);
                var idText = row.Cell(cId).GetString().Trim();
                var price = Text(row.Cell(cPrice));
                if (idText.Length == 0 && string.IsNullOrEmpty(price)) continue; // сатри холӣ
                result.Add(new PriceInputRow(
                    r,
                    int.TryParse(idText, out var id) ? id : null,
                    price,
                    cOld > 0 ? Text(row.Cell(cOld)) : null,
                    cActive > 0 ? row.Cell(cActive).GetString() : null));
            }
            return result;
        }
    }

    /// <summary>Рақам — бо нуқта (бе вобастагӣ аз забони Excel), матн — чӣ хеле ҳаст.</summary>
    private static string? Text(IXLCell cell) =>
        cell.IsEmpty() ? null
        : cell.DataType == XLDataType.Number ? cell.GetDouble().ToString(System.Globalization.CultureInfo.InvariantCulture)
        : cell.GetString();
}
