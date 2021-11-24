CREATE TABLE [dbo].[BenefitType]
(
[BenefitTypeID] [int] NOT NULL IDENTITY(1, 1),
[BenefitType] [nvarchar] (100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[BenefitCompanyName] [nvarchar] (100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[PolicyNumber] [int] NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[BenefitType] ADD CONSTRAINT [PK_BenefitType] PRIMARY KEY CLUSTERED ([BenefitTypeID]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[BenefitType] ADD CONSTRAINT [AK_BenefitType_PolicyNumber] UNIQUE NONCLUSTERED ([PolicyNumber]) ON [PRIMARY]
GO
