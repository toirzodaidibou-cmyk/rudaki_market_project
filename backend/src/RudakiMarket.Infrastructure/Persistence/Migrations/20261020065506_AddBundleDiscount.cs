using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RudakiMarket.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBundleDiscount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "discount",
                table: "orders",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "discount_note",
                table: "orders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "discount_percent",
                table: "bundles",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "discount",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "discount_note",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "discount_percent",
                table: "bundles");
        }
    }
}
