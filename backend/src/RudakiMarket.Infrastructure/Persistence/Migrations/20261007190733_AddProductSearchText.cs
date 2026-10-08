using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RudakiMarket.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductSearchText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "search_text",
                table: "products",
                type: "text",
                nullable: true,
                computedColumnSql: "translate(lower(name_tg || ' ' || name_ru || ' ' || name_en || ' ' || name_uz), 'ҷӯӣҳқғёй''’`ʼ', 'чуихкгеи')",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "ix_products_search_text",
                table: "products",
                column: "search_text")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_products_search_text",
                table: "products");

            migrationBuilder.DropColumn(
                name: "search_text",
                table: "products");
        }
    }
}
