namespace RudakiMarket.Application.Abstractions;

/// <summary>SMS фиристода нашуд (хизматрасон дастрас нест ё хато дод).</summary>
public sealed class SmsSendException(string message, Exception? inner = null) : Exception(message, inner);
