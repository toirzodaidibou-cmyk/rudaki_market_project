using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RudakiMarket.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBanners : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "banners",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    badge_tg = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    badge_ru = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    badge_en = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    badge_uz = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    title_tg = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    title_ru = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    title_en = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    title_uz = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    text_tg = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    text_ru = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    text_en = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    text_uz = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    cta_tg = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    cta_ru = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    cta_en = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    cta_uz = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    href = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    theme = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    image_path = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_banners", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_banners_is_active_sort_order",
                table: "banners",
                columns: new[] { "is_active", "sort_order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "banners");
        }
    }
}
