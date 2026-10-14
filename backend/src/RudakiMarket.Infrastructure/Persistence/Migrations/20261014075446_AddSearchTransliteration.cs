using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RudakiMarket.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSearchTransliteration : Migration
    {
        /// <summary>
        /// Ҳарфҳои лотинӣ → кириллӣ, тавре ки мизоҷ брендро менависад: аввал ҳарфҳои дукарата (sh → ш, ch → ч, ck → к ...),
        /// c пеш аз e/i/y → с, вагарна → к; баъд ҳарф ба ҳарф. Ҳарфҳои кириллӣ бетағйир мемонанд.
        /// IMMUTABLE — то дар сутуни ҳисобшаванда (STORED) истифода шавад.
        /// </summary>
        internal const string CreateTranslitFunction = """
            CREATE OR REPLACE FUNCTION public.rm_latin_to_cyr(s text) RETURNS text
            LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
            SET search_path = ''
            AS $fn$
              SELECT pg_catalog.translate(
                pg_catalog.regexp_replace(pg_catalog.regexp_replace(pg_catalog.regexp_replace(pg_catalog.regexp_replace(
                pg_catalog.regexp_replace(pg_catalog.regexp_replace(pg_catalog.regexp_replace(pg_catalog.regexp_replace(
                pg_catalog.regexp_replace(pg_catalog.regexp_replace(pg_catalog.regexp_replace(pg_catalog.regexp_replace(
                pg_catalog.regexp_replace(pg_catalog.regexp_replace(
                  pg_catalog.lower(s),
                  'sch', 'ш', 'g'), 'sh', 'ш', 'g'), 'ch', 'ч', 'g'), 'zh', 'ж', 'g'), 'kh', 'х', 'g'),
                  'ph', 'ф', 'g'), 'th', 'т', 'g'), 'ck', 'к', 'g'), 'qu', 'кв', 'g'), 'ee', 'и', 'g'),
                  'oo', 'у', 'g'), 'x', 'кс', 'g'), 'j', 'дж', 'g'), 'c([eiy])', 'с\1', 'g'),
                'abcdefghiklmnopqrstuvwyz', 'абкдефгхиклмнопкрстуввиз')
            $fn$;
            """;

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(CreateTranslitFunction);

            migrationBuilder.AlterColumn<string>(
                name: "search_text",
                table: "products",
                type: "text",
                nullable: true,
                computedColumnSql: "translate(lower(name_tg || ' ' || name_ru || ' ' || name_en || ' ' || name_uz || ' ' || public.rm_latin_to_cyr(name_ru)), 'ҷӯӣҳқғёй''’`ʼ', 'чуихкгеи')",
                stored: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true,
                oldComputedColumnSql: "translate(lower(name_tg || ' ' || name_ru || ' ' || name_en || ' ' || name_uz), 'ҷӯӣҳқғёй''’`ʼ', 'чуихкгеи')",
                oldStored: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "search_text",
                table: "products",
                type: "text",
                nullable: true,
                computedColumnSql: "translate(lower(name_tg || ' ' || name_ru || ' ' || name_en || ' ' || name_uz), 'ҷӯӣҳқғёй''’`ʼ', 'чуихкгеи')",
                stored: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true,
                oldComputedColumnSql: "translate(lower(name_tg || ' ' || name_ru || ' ' || name_en || ' ' || name_uz || ' ' || public.rm_latin_to_cyr(name_ru)), 'ҷӯӣҳқғёй''’`ʼ', 'чуихкгеи')",
                oldStored: true);

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS public.rm_latin_to_cyr(text);");
        }
    }
}
