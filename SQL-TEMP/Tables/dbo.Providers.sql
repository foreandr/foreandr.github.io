CREATE TABLE [dbo].[Providers]
(
[ProviderID] [int] NOT NULL IDENTITY(1, 1),
[ProviderName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[ProviderAddress] [nvarchar] (60) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[ProviderCity] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Providers] ADD CONSTRAINT [PK_Providers] PRIMARY KEY CLUSTERED ([ProviderID]) ON [PRIMARY]
GO
