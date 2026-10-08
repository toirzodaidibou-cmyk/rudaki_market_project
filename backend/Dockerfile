# RUDAKI MARKET API — барои сервери абрӣ (Render, ройгон). Сохтан аз папкаи backend:
#   docker build -t rudaki-api .
# Танзимот (пайвасти база, калидҳо) — танҳо тавассути environment-и сервер, на дар ин файл.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
# Аввал танҳо лоиҳаҳо — restore кэш мешавад, агар пакетҳо тағйир наёбанд
COPY RudakiMarket.slnx ./
COPY src/RudakiMarket.Domain/RudakiMarket.Domain.csproj src/RudakiMarket.Domain/
COPY src/RudakiMarket.Application/RudakiMarket.Application.csproj src/RudakiMarket.Application/
COPY src/RudakiMarket.Infrastructure/RudakiMarket.Infrastructure.csproj src/RudakiMarket.Infrastructure/
COPY src/RudakiMarket.Api/RudakiMarket.Api.csproj src/RudakiMarket.Api/
RUN dotnet restore src/RudakiMarket.Api/RudakiMarket.Api.csproj
COPY src/ src/
RUN dotnet publish src/RudakiMarket.Api/RudakiMarket.Api.csproj -c Release --no-restore -o /app && mkdir -p /app/wwwroot

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
# Render порти 10000-ро интизор аст
ENV ASPNETCORE_HTTP_PORTS=10000 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 10000
COPY --from=build /app ./
# Корбари бе ҳуқуқи root (дар image-и .NET ҳаст)
USER app
ENTRYPOINT ["dotnet", "RudakiMarket.Api.dll"]
