namespace RudakiMarket.Domain.Entities;

/// <summary>Рамзи якдафъаинаи SMS. Худи рамз нигоҳ дошта намешавад — танҳо HMAC-и он.</summary>
public sealed class LoginCode
{
    public long Id { get; private set; }
    public string Phone { get; set; } = "";
    public string CodeHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>Кӯшишҳои нодуруст. Баъд аз ҳадди аксар рамз дигар қабул намешавад.</summary>
    public int Attempts { get; set; }

    /// <summary>Вақти истифода (ё бекор шудан ҳангоми дархости рамзи нав).</summary>
    public DateTimeOffset? UsedAt { get; set; }
}
