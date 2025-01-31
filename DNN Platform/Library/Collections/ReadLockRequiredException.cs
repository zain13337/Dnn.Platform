﻿// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information
namespace DotNetNuke.Collections.Internal
{
    using System;

    /// <summary>Thrown when a read lock is required but can't be obtained.</summary>
    public class ReadLockRequiredException : Exception
    {
    }
}
