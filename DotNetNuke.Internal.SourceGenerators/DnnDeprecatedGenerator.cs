﻿// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information
namespace DotNetNuke.Internal.SourceGenerators;

using System.CodeDom.Compiler;
using System.Collections.Immutable;
using System.Text;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

/// <summary>A source generator which turns <see cref="DnnDeprecatedAttribute"/> into <see cref="ObsoleteAttribute"/>.</summary>
[Generator]
public class DnnDeprecatedGenerator : IIncrementalGenerator
{
    private const string DnnDeprecatedTypeName = "DotNetNuke.Internal.SourceGenerators.DnnDeprecatedAttribute";

    /// <inheritdoc/>
    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        var classes = context.SyntaxProvider.CreateSyntaxProvider(
                predicate: HasAttribute,
                transform: GetIfHasDeprecatedAttribute)
            .Where(static classDeclaration => classDeclaration is not null);

        context.RegisterSourceOutput(context.CompilationProvider.Combine(classes.Collect()), Execute);
    }

    private static void Execute(SourceProductionContext context, (Compilation compilation, ImmutableArray<MemberDeclarationSyntax?> members) value)
    {
        var members = value.members;
        if (members.IsDefaultOrEmpty)
        {
            return;
        }

        var compilation = value.compilation;

        var dnnDeprecatedType = compilation.GetTypeByMetadataName(DnnDeprecatedTypeName);
        if (dnnDeprecatedType is null)
        {
            return;
        }

        foreach (var memberDeclaration in members)
        {
            context.CancellationToken.ThrowIfCancellationRequested();
            if (memberDeclaration is null)
            {
                return;
            }

            if (ReportDiagnosticIfNotPartial(context, memberDeclaration))
            {
                continue;
            }

            var semanticModel = compilation.GetSemanticModel(memberDeclaration.SyntaxTree);
            var symbol = semanticModel.GetDeclaredSymbol(memberDeclaration, context.CancellationToken);
            if (symbol is null)
            {
                continue;
            }

            var deprecation = GetDeprecation(symbol, dnnDeprecatedType);
            if (deprecation is null)
            {
                continue;
            }

            var namespaceName = GetNamespace(memberDeclaration);
            var containingTypes = new Stack<TypeDeclarationSyntax>();
            var parent = memberDeclaration.Parent;
            while (parent is TypeDeclarationSyntax parentType)
            {
                containingTypes.Push(parentType);
                parent = parent.Parent;
            }

            var stringWriter = new StringWriter();
            var writer = new IndentedTextWriter(stringWriter);

            writer.WriteLine("// <auto-generated/>");
            writer.WriteLine($"namespace {namespaceName};");
            writer.WriteLine();

            foreach (var containingType in containingTypes)
            {
                OpenPartialType(writer, semanticModel, containingType, context.CancellationToken);
                writer.Indent++;
            }

            writer.WriteLine($"""
[global::System.Obsolete(@"Deprecated in DotNetNuke {deprecation.MajorVersion}.{deprecation.MinorVersion}.{deprecation.PatchVersion}. {deprecation.Replacement.TrimEnd('.').Replace("\"", "\"\"")}. Scheduled for removal in v{deprecation.RemovalVersion}.0.0.")]
""");
            switch (memberDeclaration)
            {
                case TypeDeclarationSyntax typeDeclaration:
                    OpenPartialType(writer, semanticModel, typeDeclaration, context.CancellationToken);
                    writer.WriteLine('}');
                    break;
                case MethodDeclarationSyntax methodDeclaration:
                    WritePartialMethod(writer, semanticModel, methodDeclaration, context.CancellationToken);
                    break;
            }

            foreach (var unused in containingTypes)
            {
                writer.Indent--;
                writer.WriteLine("}");
            }

            writer.WriteLine();

            context.AddSource(GetHintName(namespaceName, containingTypes, symbol), stringWriter.ToString());
        }
    }

    private static void OpenPartialType(
        IndentedTextWriter writer,
        SemanticModel semanticModel,
        TypeDeclarationSyntax typeDeclaration,
        CancellationToken cancellationToken)
    {
        writer.Write($"partial {typeDeclaration.Keyword} {typeDeclaration.Identifier}");
        if (typeDeclaration.TypeParameterList is not null)
        {
            var typeSymbol = semanticModel.GetDeclaredSymbol(typeDeclaration, cancellationToken);
            if (typeSymbol is not null)
            {
                writer.Write('<');

                var isFirst = true;
                foreach (var parameter in typeDeclaration.TypeParameterList.Parameters)
                {
                    if (isFirst)
                    {
                        isFirst = false;
                    }
                    else
                    {
                        writer.Write(',');
                    }

                    writer.Write(parameter.Identifier);
                }

                writer.Write('>');
            }
        }

        writer.WriteLine();
        writer.WriteLine("{");
    }

    private static void WritePartialMethod(
        IndentedTextWriter writer,
        SemanticModel semanticModel,
        BaseMethodDeclarationSyntax methodDeclaration,
        CancellationToken cancellationToken)
    {
        var methodSymbol = semanticModel.GetDeclaredSymbol(methodDeclaration, cancellationToken);
        if (methodSymbol is null)
        {
            writer.WriteLine("COULD NOT GET METHOD SYMBOL FOR " + methodDeclaration);
            return;
        }

        var returnType = methodSymbol.ReturnsVoid ? "void" : methodSymbol.ReturnType.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);
        writer.Write($"{methodDeclaration.Modifiers} {returnType} {methodSymbol.Name}");
        WriteMethodTypeParameters(writer, methodSymbol);
        WriteMethodParameters(writer, methodSymbol);
        WriteMethodTypeConstraints(writer, methodSymbol);
        writer.WriteLine(';');
    }

    private static void WriteMethodTypeParameters(IndentedTextWriter writer, IMethodSymbol methodSymbol)
    {
        if (!methodSymbol.TypeParameters.IsDefaultOrEmpty)
        {
            writer.Write('<');

            var isFirst = true;
            foreach (var typeParameter in methodSymbol.TypeParameters)
            {
                if (isFirst)
                {
                    isFirst = false;
                }
                else
                {
                    writer.Write(',');
                }

                writer.Write(typeParameter.Name);
            }

            writer.Write('>');
        }
    }

    private static void WriteMethodTypeConstraints(IndentedTextWriter writer, IMethodSymbol methodSymbol)
    {
        writer.Indent++;
        foreach (var parameter in methodSymbol.TypeParameters)
        {
            if (!parameter.ConstraintTypes.IsDefaultOrEmpty ||
                parameter.HasConstructorConstraint ||
                parameter.HasNotNullConstraint ||
                parameter.HasReferenceTypeConstraint ||
                parameter.HasUnmanagedTypeConstraint ||
                parameter.HasValueTypeConstraint)
            {
                writer.WriteLine();
                writer.Write($"where {parameter.Name} : ");
            }

            var isFirstConstraint = true;
            foreach (var constraintType in parameter.ConstraintTypes)
            {
                if (isFirstConstraint)
                {
                    isFirstConstraint = false;
                }
                else
                {
                    writer.Write(',');
                }

                writer.Write(constraintType.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat));
            }

            if (parameter.HasNotNullConstraint)
            {
                if (isFirstConstraint)
                {
                    isFirstConstraint = false;
                }
                else
                {
                    writer.Write(',');
                }

                writer.Write("notnull");
            }

            if (parameter.HasReferenceTypeConstraint)
            {
                if (isFirstConstraint)
                {
                    isFirstConstraint = false;
                }
                else
                {
                    writer.Write(',');
                }

                writer.Write("class");
            }

            if (parameter.HasUnmanagedTypeConstraint)
            {
                if (isFirstConstraint)
                {
                    isFirstConstraint = false;
                }
                else
                {
                    writer.Write(',');
                }

                writer.Write("unmanaged");
            }

            if (parameter.HasValueTypeConstraint)
            {
                if (isFirstConstraint)
                {
                    isFirstConstraint = false;
                }
                else
                {
                    writer.Write(',');
                }

                writer.Write("struct");
            }

            if (parameter.HasConstructorConstraint)
            {
                if (!isFirstConstraint)
                {
                    writer.Write(',');
                }

                writer.Write("new()");
            }
        }

        writer.Indent--;
    }

    private static void WriteMethodParameters(IndentedTextWriter writer, IMethodSymbol methodSymbol)
    {
        writer.Write("(");
        if (methodSymbol.Parameters.IsDefaultOrEmpty)
        {
            writer.Write(')');
            return;
        }

        writer.WriteLine();
        writer.Indent++;

        var isFirst = true;
        foreach (var parameter in methodSymbol.Parameters)
        {
            if (isFirst)
            {
                isFirst = false;
            }
            else
            {
                writer.WriteLine(',');
            }

            if (methodSymbol.IsExtensionMethod)
            {
                writer.Write("this ");
            }

            writer.Write(GetParameterPrefix(parameter.RefKind));
            if (parameter.IsParams)
            {
                writer.Write("params ");
            }

            writer.Write($"{parameter.Type.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat)} {parameter.Name}");
            if (parameter.HasExplicitDefaultValue)
            {
                writer.Write(" = ");
                switch (parameter.ExplicitDefaultValue)
                {
                    case null:
                        writer.Write("null");
                        break;
                    case true:
                        writer.Write("true");
                        break;
                    case false:
                        writer.Write("false");
                        break;
                    case string stringValue:
                        writer.Write("@\"");
                        writer.Write(stringValue.Replace("\"", "\"\""));
                        writer.Write('"');
                        break;
                    default:
                        writer.Write(parameter.ExplicitDefaultValue);
                        break;
                }
            }
        }

        writer.Indent--;

        writer.Write(')');
    }

    private static string GetParameterPrefix(RefKind refKind)
    {
        return refKind switch
        {
            RefKind.None => string.Empty,
            RefKind.Ref => "ref ",
            RefKind.Out => "out ",
            RefKind.In => "in ",
            _ => throw new ArgumentOutOfRangeException(nameof(refKind), refKind, "Unexpected RefKind value"),
        };
    }

    private static string GetHintName(string namespaceName, IEnumerable<TypeDeclarationSyntax> containingTypes, ISymbol symbol)
    {
        var hintNameBuilder = new StringBuilder(namespaceName);
        foreach (var type in containingTypes)
        {
            hintNameBuilder.Append($".{type.Identifier}");
            if (type.TypeParameterList is not null && type.TypeParameterList.Parameters.Count > 0)
            {
                hintNameBuilder.Append($"`{type.TypeParameterList.Parameters.Count}");
            }
        }

        hintNameBuilder.Append($".{symbol.Name}");
        if (symbol is INamedTypeSymbol { IsGenericType: true } namedTypeSymbol)
        {
            hintNameBuilder.Append($"`{namedTypeSymbol.TypeParameters.Length}");
        }

        if (symbol is not IMethodSymbol method)
        {
            return hintNameBuilder.ToString();
        }

        if (!method.TypeParameters.IsDefaultOrEmpty)
        {
            hintNameBuilder.Append($"`{method.TypeParameters.Length}");
        }

        var isFirst = true;
        hintNameBuilder.Append('(');
        foreach (var parameter in method.Parameters)
        {
            if (isFirst)
            {
                isFirst = false;
            }
            else
            {
                hintNameBuilder.Append(',');
            }

            hintNameBuilder.Append(GetParameterPrefix(parameter.RefKind));
            hintNameBuilder.Append(parameter.Type.ToDisplayString(SymbolDisplayFormat.MinimallyQualifiedFormat).Replace("?", "_NULLABLE_").Replace("<", "__").Replace(">", "__"));
        }

        hintNameBuilder.Append(')');

        return hintNameBuilder.ToString();
    }

    private static bool ReportDiagnosticIfNotPartial(SourceProductionContext context, MemberDeclarationSyntax declaration)
    {
        var isPartial = false;
        foreach (var modifier in declaration.Modifiers)
        {
            if (modifier.IsKind(SyntaxKind.PartialKeyword))
            {
                isPartial = true;
                break;
            }
        }

        if (isPartial)
        {
            return false;
        }

        var diagnostic = Diagnostic.Create(
            new DiagnosticDescriptor(
                "DNN1001",
                "Must be partial",
                "The member that the DnnDeprecated attribute is applied to must be partial",
                "Usage",
                DiagnosticSeverity.Error,
                isEnabledByDefault: true),
            declaration.GetLocation());
        context.ReportDiagnostic(diagnostic);
        return true;
    }

    private static DnnDeprecatedAttribute? GetDeprecation(ISymbol typeSymbol, ISymbol dnnDeprecatedType)
    {
        foreach (var attribute in typeSymbol.GetAttributes())
        {
            if (!dnnDeprecatedType.Equals(attribute.AttributeClass, SymbolEqualityComparer.Default))
            {
                continue;
            }

            var args = attribute.ConstructorArguments;
            foreach (var arg in args)
            {
                if (arg.Kind == TypedConstantKind.Error)
                {
                    return null;
                }
            }

            var deprecation = new DnnDeprecatedAttribute(
                (int)args[0].Value!,
                (int)args[1].Value!,
                (int)args[2].Value!,
                (string)args[3].Value!);

            foreach (var arg in attribute.NamedArguments)
            {
                if (!arg.Key.Equals(nameof(DnnDeprecatedAttribute.RemovalVersion), StringComparison.Ordinal))
                {
                    continue;
                }

                if (arg.Value.Kind == TypedConstantKind.Error)
                {
                    return null;
                }

                if (deprecation is not null)
                {
                    deprecation.RemovalVersion = (int)arg.Value.Value!;
                    return deprecation;
                }
            }

            return deprecation;
        }

        return null;
    }

    private static string GetNamespace(SyntaxNode classDeclaration)
    {
        var memberNamespace = classDeclaration.Parent;
        while (memberNamespace is not null &&
               memberNamespace is not NamespaceDeclarationSyntax &&
               memberNamespace is not FileScopedNamespaceDeclarationSyntax)
        {
            memberNamespace = memberNamespace.Parent;
        }

        if (memberNamespace is not BaseNamespaceDeclarationSyntax namespaceParent)
        {
            return string.Empty;
        }

        var namespaceName = namespaceParent.Name.ToString();
        while (true)
        {
            if (namespaceParent.Parent is not NamespaceDeclarationSyntax namespaceParentParent)
            {
                break;
            }

            namespaceParent = namespaceParentParent;
            namespaceName = $"{namespaceParent.Name}.{namespaceName}";
        }

        return namespaceName;
    }

    private static bool HasAttribute(SyntaxNode node, CancellationToken token)
    {
        return node is MemberDeclarationSyntax { AttributeLists.Count: > 0 };
    }

    private static MemberDeclarationSyntax? GetIfHasDeprecatedAttribute(GeneratorSyntaxContext context, CancellationToken token)
    {
        var member = (MemberDeclarationSyntax)context.Node;
        foreach (var attributeList in member.AttributeLists)
        {
            foreach (var attribute in attributeList.Attributes)
            {
                token.ThrowIfCancellationRequested();
                if (context.SemanticModel.GetSymbolInfo(attribute).Symbol is not IMethodSymbol attributeSymbol)
                {
                    continue;
                }

                var attributeType = attributeSymbol.ContainingType;
                if (attributeType.ToDisplayString().Equals(DnnDeprecatedTypeName, StringComparison.Ordinal))
                {
                    return member;
                }
            }
        }

        return null;
    }
}
